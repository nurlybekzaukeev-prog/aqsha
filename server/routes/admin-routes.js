const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const { Router } = require("express");
const { all, get, run } = require("../db/client");
const { asyncHandler } = require("../lib/async-handler");
const { badRequest, unauthorized, notFound } = require("../lib/http-error");
const { parsePositiveInt } = require("../lib/validators");
const { bufferToBase64Url, base64UrlToBuffer, parseTransports } = require("../lib/webauthn");
const { authMiddleware } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");
const { createNotification } = require("../lib/notifications");
const {
  ADMIN_MFA_SECRET,
  ADMIN_MFA_TTL_MIN,
  UPLOAD_DIR,
  WEBAUTHN_RP_ID,
  WEBAUTHN_ORIGIN,
  WEBAUTHN_RP_NAME,
} = require("../config");

const adminRouter = Router();

adminRouter.use(authMiddleware, requireAdmin);

const CHALLENGE_TTL_MIN = 5;
let webauthnModule;

async function loadWebauthn() {
  if (webauthnModule) return webauthnModule;
  const mod = await import("@simplewebauthn/server");
  webauthnModule = mod.default ? { ...mod.default, ...mod } : mod;
  return webauthnModule;
}

function isExpired(isoDate) {
  return Date.now() > new Date(isoDate).getTime();
}

async function setChallenge(userId, type, challenge) {
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MIN * 60 * 1000).toISOString();
  await run("DELETE FROM webauthn_challenges WHERE user_id = $1 AND type = $2", [userId, type]);
  await run(
    "INSERT INTO webauthn_challenges (user_id, type, challenge, expires_at) VALUES ($1, $2, $3, $4)",
    [userId, type, challenge, expiresAt]
  );
}

async function getChallenge(userId, type) {
  return get(
    "SELECT challenge, expires_at FROM webauthn_challenges WHERE user_id = $1 AND type = $2 ORDER BY id DESC LIMIT 1",
    [userId, type]
  );
}

async function clearChallenge(userId, type) {
  await run("DELETE FROM webauthn_challenges WHERE user_id = $1 AND type = $2", [userId, type]);
}

function signAdminMfaToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, adminMfa: true },
    ADMIN_MFA_SECRET,
    { expiresIn: `${ADMIN_MFA_TTL_MIN}m` }
  );
}

adminRouter.get(
  "/admin/webauthn/status",
  asyncHandler(async (req, res) => {
    const row = await get(
      "SELECT COUNT(*) as count FROM webauthn_credentials WHERE user_id = $1",
      [req.user.id]
    );
    res.json({ registered: Number(row?.count) > 0 });
  })
);

adminRouter.post(
  "/admin/webauthn/register/options",
  asyncHandler(async (req, res) => {
    const { generateRegistrationOptions } = await loadWebauthn();
    const credentials = await all(
      "SELECT credential_id, transports FROM webauthn_credentials WHERE user_id = $1",
      [req.user.id]
    );

    const options = await generateRegistrationOptions({
      rpName: WEBAUTHN_RP_NAME,
      rpID: WEBAUTHN_RP_ID,
      userID: new TextEncoder().encode(String(req.user.id)),
      userName: req.user.email,
      timeout: 60_000,
      attestationType: "none",
      excludeCredentials: credentials.map((cred) => ({
        id: cred.credential_id,
        type: "public-key",
        transports: parseTransports(cred.transports),
      })),
    });

    await setChallenge(req.user.id, "registration", options.challenge);
    res.json(options);
  })
);

adminRouter.post(
  "/admin/webauthn/register/verify",
  asyncHandler(async (req, res) => {
    const { verifyRegistrationResponse } = await loadWebauthn();
    const response = req.body?.response;
    if (!response) {
      throw badRequest("Некорректный ответ WebAuthn");
    }

    const challengeRow = await getChallenge(req.user.id, "registration");
    if (!challengeRow || isExpired(challengeRow.expires_at)) {
      throw unauthorized("Сессия регистрации FaceID истекла");
    }

    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: WEBAUTHN_ORIGIN,
      expectedRPID: WEBAUTHN_RP_ID,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw unauthorized("Не удалось подтвердить FaceID");
    }

    const { credential, counter } = verification.registrationInfo;
    const transports = Array.isArray(req.body.response?.transports)
      ? req.body.response.transports
      : [];

    await run(
      `INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter, transports)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (credential_id) DO UPDATE SET public_key = $3, counter = $4, transports = $5`,
      [
        req.user.id,
        credential.id,
        bufferToBase64Url(credential.publicKey),
        counter,
        JSON.stringify(transports),
      ]
    );

    await clearChallenge(req.user.id, "registration");
    res.json({ ok: true, registered: true });
  })
);

adminRouter.post(
  "/admin/webauthn/auth/options",
  asyncHandler(async (req, res) => {
    const { generateAuthenticationOptions } = await loadWebauthn();
    const credentials = await all(
      "SELECT credential_id, transports FROM webauthn_credentials WHERE user_id = $1",
      [req.user.id]
    );

    if (!credentials.length) {
      throw badRequest("FaceID не подключен для этого аккаунта");
    }

    const options = await generateAuthenticationOptions({
      rpID: WEBAUTHN_RP_ID,
      userVerification: "required",
      timeout: 60_000,
      allowCredentials: credentials.map((cred) => ({
        id: cred.credential_id,
        type: "public-key",
        transports: parseTransports(cred.transports),
      })),
    });

    await setChallenge(req.user.id, "authentication", options.challenge);
    res.json(options);
  })
);

adminRouter.post(
  "/admin/webauthn/auth/verify",
  asyncHandler(async (req, res) => {
    const { verifyAuthenticationResponse } = await loadWebauthn();
    const body = req.body;
    const credentialId = body?.id || body?.rawId;
    if (!credentialId) {
      throw badRequest("Некорректный ответ WebAuthn");
    }

    const challengeRow = await getChallenge(req.user.id, "authentication");
    if (!challengeRow || isExpired(challengeRow.expires_at)) {
      throw unauthorized("Сессия FaceID истекла");
    }

    const storedCredential = await get(
      "SELECT credential_id, public_key, counter FROM webauthn_credentials WHERE user_id = $1 AND credential_id = $2",
      [req.user.id, credentialId]
    );

    if (!storedCredential) {
      throw unauthorized("Ключ FaceID не найден");
    }

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: WEBAUTHN_ORIGIN,
      expectedRPID: WEBAUTHN_RP_ID,
      credential: {
        id: storedCredential.credential_id,
        publicKey: base64UrlToBuffer(storedCredential.public_key),
        counter: storedCredential.counter,
      },
      requireUserVerification: true,
    });

    if (!verification.verified) {
      throw unauthorized("Не удалось подтвердить FaceID");
    }

    await run("UPDATE webauthn_credentials SET counter = $1 WHERE credential_id = $2", [
      verification.authenticationInfo.newCounter,
      storedCredential.credential_id,
    ]);
    await clearChallenge(req.user.id, "authentication");

    res.json({
      ok: true,
      adminMfaToken: signAdminMfaToken(req.user),
      expiresInMin: ADMIN_MFA_TTL_MIN,
    });
  })
);


async function getImagesMap(adIds) {
  if (!adIds.length) return {};
  const placeholders = adIds.map((_, i) => `$${i + 1}`).join(",");
  const rows = await all(`SELECT ad_id, url FROM images WHERE ad_id IN (${placeholders})`, adIds);
  return rows.reduce((acc, row) => {
    if (!acc[row.ad_id]) acc[row.ad_id] = [];
    acc[row.ad_id].push(row.url);
    return acc;
  }, {});
}

adminRouter.get(
  "/admin/ads",
  asyncHandler(async (_req, res) => {
    const rows = await all(
      `
        SELECT ads.*, users.name AS owner_name, users.university AS owner_university, users.is_verified AS owner_verified
        FROM ads
        JOIN users ON users.id = ads.user_id
        ORDER BY ads.created_at DESC
        LIMIT 200
      `
    );

    const imagesMap = await getImagesMap(rows.map((row) => row.id));

    res.json(
      rows.map((row) => ({
        id: row.id,
        title: row.title,
        category: row.category,
        price: row.price,
        university: row.university,
        description: row.description,
        status: row.status,
        createdAt: row.created_at,
        images: imagesMap[row.id] || [],
        user: {
          id: row.user_id,
          name: row.owner_name,
          university: row.owner_university,
          verified: Boolean(row.owner_verified),
        },
      }))
    );
  })
);

adminRouter.delete(
  "/admin/ads/:id",
  asyncHandler(async (req, res) => {
    const adId = parsePositiveInt(req.params.id, "id");

    const ad = await get("SELECT id FROM ads WHERE id = $1", [adId]);
    if (!ad) {
      throw notFound("Объявление не найдено");
    }

    const images = await all("SELECT url FROM images WHERE ad_id = $1", [adId]);
    await run("DELETE FROM ads WHERE id = $1", [adId]);

    for (const image of images) {
      if (image.url.startsWith("/uploads/")) {
        const filePath = path.join(UPLOAD_DIR, path.basename(image.url));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    res.json({ ok: true });
  })
);

async function getServiceImagesMap(serviceIds) {
  if (!serviceIds.length) return {};
  const placeholders = serviceIds.map((_, i) => `$${i + 1}`).join(",");
  const rows = await all(`SELECT service_id, url FROM service_images WHERE service_id IN (${placeholders})`, serviceIds);
  return rows.reduce((acc, row) => {
    if (!acc[row.service_id]) acc[row.service_id] = [];
    acc[row.service_id].push(row.url);
    return acc;
  }, {});
}

adminRouter.get(
  "/admin/services",
  asyncHandler(async (_req, res) => {
    const rows = await all(
      `
        SELECT services.*, users.name AS owner_name, users.university AS owner_university, users.is_verified AS owner_verified
        FROM services
        JOIN users ON users.id = services.user_id
        ORDER BY services.created_at DESC
        LIMIT 200
      `
    );

    const imagesMap = await getServiceImagesMap(rows.map((row) => row.id));

    res.json(
      rows.map((row) => ({
        id: row.id,
        title: row.title,
        category: row.category,
        price: row.price,
        university: row.university,
        description: row.description,
        createdAt: row.created_at,
        images: imagesMap[row.id] || [],
        user: {
          id: row.user_id,
          name: row.owner_name,
          university: row.owner_university,
          verified: Boolean(row.owner_verified),
        },
      }))
    );
  })
);

adminRouter.delete(
  "/admin/services/:id",
  asyncHandler(async (req, res) => {
    const serviceId = parsePositiveInt(req.params.id, "id");

    const service = await get("SELECT id FROM services WHERE id = $1", [serviceId]);
    if (!service) {
      throw notFound("Услуга не найдена");
    }

    const images = await all("SELECT url FROM service_images WHERE service_id = $1", [serviceId]);
    await run("DELETE FROM services WHERE id = $1", [serviceId]);

    for (const image of images) {
      if (image.url.startsWith("/uploads/")) {
        const filePath = path.join(UPLOAD_DIR, path.basename(image.url));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    res.json({ ok: true });
  })
);

adminRouter.patch(
  "/admin/users/:id/verify",
  asyncHandler(async (req, res) => {
    const userId = parsePositiveInt(req.params.id, "id");
    const verified = req.body?.verified === false ? 0 : 1;
    const verificationStatus = verified ? "approved" : "rejected";

    const user = await get("SELECT id FROM users WHERE id = $1", [userId]);
    if (!user) {
      throw notFound("Пользователь не найден");
    }

    await run("UPDATE users SET is_verified = $1, verification_status = $2 WHERE id = $3", [verified, verificationStatus, userId]);

    if (verified) {
      await createNotification(userId, "system", "Верификация одобрена ✅", "Ваш аккаунт успешно верифицирован!", "/profile");
    } else {
      await createNotification(userId, "system", "Верификация отклонена ❌", "Ваша заявка на верификацию была отклонена. Попробуйте загрузить другое фото ID-карты.", "/profile");
    }

    res.json({ ok: true, verified: Boolean(verified) });
  })
);

adminRouter.get(
  "/admin/orders",
  asyncHandler(async (_req, res) => {
    const rows = await all(
      `
        SELECT o.*, 
               s.title as service_title, s.price as service_price,
               c.name as client_name, p.name as provider_name
        FROM service_orders o
        JOIN services s ON s.id = o.service_id
        JOIN users c ON c.id = o.client_id
        JOIN users p ON p.id = o.provider_id
        ORDER BY o.created_at DESC
        LIMIT 200
      `
    );

    res.json(
      rows.map((row) => ({
        id: row.id,
        serviceId: row.service_id,
        serviceTitle: row.service_title,
        price: row.service_price,
        clientId: row.client_id,
        clientName: row.client_name,
        providerId: row.provider_id,
        providerName: row.provider_name,
        status: row.status,
        paymentStatus: row.payment_status,
        createdAt: row.created_at,
        completedAt: row.completed_at,
      }))
    );
  })
);

adminRouter.post(
  "/admin/orders/:id/approve",
  asyncHandler(async (req, res) => {
    const orderId = parsePositiveInt(req.params.id, "id");
    
    const order = await get(
      `SELECT o.id, o.status, o.provider_id, s.price 
       FROM service_orders o
       JOIN services s ON s.id = o.service_id
       WHERE o.id = $1`,
      [orderId]
    );

    if (!order) throw notFound("Заказ не найден");
    if (order.status !== "under_review") throw badRequest("Заказ не находится на проверке");

    await run("UPDATE service_orders SET status = 'completed' WHERE id = $1", [order.id]);
    
    const price = Number(order.price) || 0;
    if (price > 0) {
      await run("UPDATE users SET balance = balance + $1 WHERE id = $2", [price, order.provider_id]);
      await run(
        "INSERT INTO transactions (user_id, amount, type, description) VALUES ($1, $2, 'income', $3)",
        [order.provider_id, price, `Оплата за заказ #${order.id}`]
      );
    }

    await createNotification(
      order.provider_id,
      "order",
      "Оплата зачислена!",
      `Администратор одобрил заказ #${order.id}. На ваш кошелек зачислено ${price} ₸.`,
      `/wallet`
    );

    res.json({ ok: true });
  })
);

/* ─── Admin: Dashboard Stats ─── */

adminRouter.get(
  "/admin/stats",
  asyncHandler(async (_req, res) => {
    const usersCount = await get("SELECT COUNT(*) as count FROM users");
    const adsCount = await get("SELECT COUNT(*) as count FROM ads");
    const servicesCount = await get("SELECT COUNT(*) as count FROM services");
    const ordersCount = await get("SELECT COUNT(*) as count FROM service_orders");
    const pendingVerifications = await get("SELECT COUNT(*) as count FROM users WHERE verification_status = 'pending' AND iin != ''");
    const revenue = await get("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income'");

    res.json({
      users: Number(usersCount?.count) || 0,
      ads: Number(adsCount?.count) || 0,
      services: Number(servicesCount?.count) || 0,
      orders: Number(ordersCount?.count) || 0,
      pendingVerifications: Number(pendingVerifications?.count) || 0,
      totalRevenue: Number(revenue?.total) || 0,
    });
  })
);

/* ─── Admin: Users List ─── */

adminRouter.get(
  "/admin/users",
  asyncHandler(async (req, res) => {
    const status = req.query.status || "";

    let sql = `
      SELECT id, name, email, university, is_verified, iin, full_name, id_card_url,
             verification_status, is_blocked, balance, created_at
      FROM users
    `;
    const params = [];
    let paramIdx = 1;

    if (status === "pending" || status === "approved" || status === "rejected") {
      sql += ` WHERE verification_status = $${paramIdx++}`;
      params.push(status);
    } else if (status === "blocked") {
      sql += " WHERE is_blocked = 1";
    }

    sql += " ORDER BY created_at DESC LIMIT 300";

    const rows = await all(sql, params);

    res.json(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        university: row.university,
        isVerified: Boolean(row.is_verified),
        iin: row.iin || "",
        fullName: row.full_name || "",
        idCardUrl: row.id_card_url || "",
        verificationStatus: row.verification_status || "pending",
        isBlocked: Boolean(row.is_blocked),
        balance: row.balance || 0,
        createdAt: row.created_at,
      }))
    );
  })
);

/* ─── Admin: Delete User ─── */

adminRouter.delete(
  "/admin/users/:id",
  asyncHandler(async (req, res) => {
    const userId = parsePositiveInt(req.params.id, "id");

    const user = await get("SELECT id FROM users WHERE id = $1", [userId]);
    if (!user) {
      throw notFound("Пользователь не найден");
    }

    await run("DELETE FROM users WHERE id = $1", [userId]);
    res.json({ ok: true });
  })
);

/* ─── Admin: Block/Unblock User ─── */

adminRouter.patch(
  "/admin/users/:id/block",
  asyncHandler(async (req, res) => {
    const userId = parsePositiveInt(req.params.id, "id");
    const blocked = req.body?.blocked === false ? 0 : 1;

    const user = await get("SELECT id FROM users WHERE id = $1", [userId]);
    if (!user) {
      throw notFound("Пользователь не найден");
    }

    await run("UPDATE users SET is_blocked = $1 WHERE id = $2", [blocked, userId]);
    res.json({ ok: true, blocked: Boolean(blocked) });
  })
);

module.exports = {
  adminRouter,
};
