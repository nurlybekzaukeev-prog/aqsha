const jwt = require("jsonwebtoken");
const { JWT_SECRET, ADMIN_EMAILS } = require("../config");
const { get } = require("../db/client");
const { unauthorized } = require("../lib/http-error");

async function authMiddleware(req, _res, next) {
  try {
    const authorization = req.headers.authorization || "";
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw unauthorized();
    }

    const payload = jwt.verify(token, JWT_SECRET);
    const user = await get(
      "SELECT id, name, email, university, is_verified, balance, iin, full_name, id_card_url, verification_status, is_blocked FROM users WHERE id = $1",
      [payload.id]
    );

    if (!user) {
      throw unauthorized("Пользователь не найден");
    }

    if (user.is_blocked) {
      throw unauthorized("Ваш аккаунт заблокирован");
    }

    const isAdmin = ADMIN_EMAILS.includes(String(user.email || "").toLowerCase());

    const ordersStat = await get(
      "SELECT COUNT(*) as count FROM service_orders WHERE provider_id = $1 AND status = 'completed'",
      [user.id]
    );
    const completedOrders = ordersStat ? Number(ordersStat.count) : 0;
    
    let rank = "Новичок";
    if (completedOrders >= 50) rank = "Мастер";
    else if (completedOrders >= 20) rank = "Профессионал";
    else if (completedOrders >= 5) rank = "Опытный";

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      university: user.university,
      isVerified: Boolean(user.is_verified),
      isAdmin,
      balance: user.balance || 0,
      completedOrders,
      rank,
      iin: user.iin || "",
      fullName: user.full_name || "",
      idCardUrl: user.id_card_url || "",
      verificationStatus: user.verification_status || "pending",
    };
    next();
  } catch (_error) {
    next(unauthorized("Недействительный токен"));
  }
}

module.exports = {
  authMiddleware,
};
