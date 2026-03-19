const bcrypt = require("bcryptjs");
const { run, get } = require("./client");
const { DEFAULT_UNIVERSITY, CATEGORIES, DEMO_IMAGE } = require("../constants");

async function initDb() {
  /* ─── users ─── */
  await run(
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      university TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      is_verified INTEGER NOT NULL DEFAULT 0,
      balance INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`
  );

  /* Add columns if missing (safe migration helpers) */
  await safeAddColumn("users", "is_verified", "INTEGER NOT NULL DEFAULT 0");
  await safeAddColumn("users", "balance", "INTEGER NOT NULL DEFAULT 0");
  await safeAddColumn("users", "iin", "TEXT DEFAULT ''");
  await safeAddColumn("users", "full_name", "TEXT DEFAULT ''");
  await safeAddColumn("users", "id_card_url", "TEXT DEFAULT ''");
  await safeAddColumn("users", "verification_status", "TEXT NOT NULL DEFAULT 'pending'");
  await safeAddColumn("users", "is_blocked", "INTEGER NOT NULL DEFAULT 0");

  /* ─── webauthn_credentials ─── */
  await run(
    `CREATE TABLE IF NOT EXISTS webauthn_credentials (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      credential_id TEXT NOT NULL UNIQUE,
      public_key TEXT NOT NULL,
      counter INTEGER NOT NULL DEFAULT 0,
      transports TEXT DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`
  );

  /* ─── webauthn_challenges (recreate) ─── */
  await run("DROP TABLE IF EXISTS webauthn_challenges");
  await run(
    `CREATE TABLE IF NOT EXISTS webauthn_challenges (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 0,
      type TEXT NOT NULL CHECK (type IN ('registration', 'authentication', 'login')),
      challenge TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`
  );

  /* ─── face_descriptors ─── */
  await run(
    `CREATE TABLE IF NOT EXISTS face_descriptors (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      descriptor TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`
  );

  /* ─── ads ─── */
  await run(
    `CREATE TABLE IF NOT EXISTS ads (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      price INTEGER NOT NULL DEFAULT 0 CHECK (price >= 0),
      university TEXT NOT NULL,
      description TEXT NOT NULL,
      contact_phone TEXT DEFAULT '',
      contact_whatsapp TEXT DEFAULT '',
      contact_telegram TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await safeAddColumn("ads", "status", "TEXT NOT NULL DEFAULT 'active'");
  await run("UPDATE ads SET status = 'active' WHERE status IS NULL OR status = ''");

  /* ─── images ─── */
  await run(
    `CREATE TABLE IF NOT EXISTS images (
      id SERIAL PRIMARY KEY,
      ad_id INTEGER NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
      url TEXT NOT NULL
    )`
  );

  /* ─── services ─── */
  await run(
    `CREATE TABLE IF NOT EXISTS services (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      price INTEGER NOT NULL DEFAULT 0 CHECK (price >= 0),
      university TEXT NOT NULL,
      description TEXT NOT NULL,
      contact_phone TEXT DEFAULT '',
      contact_whatsapp TEXT DEFAULT '',
      contact_telegram TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await safeAddColumn("services", "contact_phone", "TEXT DEFAULT ''");
  await safeAddColumn("services", "contact_whatsapp", "TEXT DEFAULT ''");
  await safeAddColumn("services", "contact_telegram", "TEXT DEFAULT ''");

  /* ─── service_images ─── */
  await run(
    `CREATE TABLE IF NOT EXISTS service_images (
      id SERIAL PRIMARY KEY,
      service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      url TEXT NOT NULL
    )`
  );

  /* ─── service_orders ─── */
  await run(
    `CREATE TABLE IF NOT EXISTS service_orders (
      id SERIAL PRIMARY KEY,
      service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'frozen', 'under_review', 'completed')),
      payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
      payment_paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMPTZ
    )`
  );

  await safeAddColumn("service_orders", "payment_status", "TEXT NOT NULL DEFAULT 'unpaid'");
  await safeAddColumn("service_orders", "payment_paid_at", "TIMESTAMPTZ");

  await run(
    "UPDATE service_orders SET payment_status = 'unpaid' WHERE payment_status IS NULL OR payment_status = ''"
  );

  /* ─── transactions ─── */
  await run(
    `CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      description TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`
  );

  /* ─── notifications ─── */
  await run(
    `CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      link TEXT DEFAULT '',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await safeAddColumn("notifications", "link", "TEXT DEFAULT ''");

  /* ─── ad_messages ─── */
  await run(
    `CREATE TABLE IF NOT EXISTS ad_messages (
      id SERIAL PRIMARY KEY,
      ad_id INTEGER NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      client_id INTEGER,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await safeAddColumn("ad_messages", "is_read", "INTEGER NOT NULL DEFAULT 0");
  await safeAddColumn("ad_messages", "client_id", "INTEGER");

  /* ─── service_messages ─── */
  await run(
    `CREATE TABLE IF NOT EXISTS service_messages (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await safeAddColumn("service_messages", "is_read", "INTEGER NOT NULL DEFAULT 0");

  /* ─── service_reviews ─── */
  await run(
    `CREATE TABLE IF NOT EXISTS service_reviews (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL UNIQUE REFERENCES service_orders(id) ON DELETE CASCADE,
      service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`
  );

  /* ─── Indexes ─── */
  await safeCreateIndex("idx_ads_created_at", "ads", "created_at DESC");
  await safeCreateIndex("idx_ads_user_id", "ads", "user_id");
  await safeCreateIndex("idx_ads_status", "ads", "status");
  await safeCreateIndex("idx_webauthn_credentials_user", "webauthn_credentials", "user_id");
  await safeCreateIndex("idx_webauthn_challenges_user", "webauthn_challenges", "user_id");
  await safeCreateIndex("idx_images_ad_id", "images", "ad_id");
  await safeCreateIndex("idx_services_created_at", "services", "created_at DESC");
  await safeCreateIndex("idx_services_user_id", "services", "user_id");
  await safeCreateIndex("idx_service_images_service_id", "service_images", "service_id");
  await safeCreateIndex("idx_service_orders_service_id", "service_orders", "service_id");
  await safeCreateIndex("idx_service_orders_client_id", "service_orders", "client_id");
  await safeCreateIndex("idx_service_orders_provider_id", "service_orders", "provider_id");
  await safeCreateIndex("idx_service_messages_order_id", "service_messages", "order_id");
  await safeCreateIndex("idx_service_reviews_service_id", "service_reviews", "service_id");
  await safeCreateIndex("idx_notifications_user_id", "notifications", "user_id");
  await safeCreateIndex("idx_notifications_read", "notifications", "is_read");
  await safeCreateIndex("idx_face_descriptors_user_id", "face_descriptors", "user_id");
  await safeCreateIndex("idx_ad_messages_ad_id", "ad_messages", "ad_id");
  await safeCreateIndex("idx_ad_messages_sender_id", "ad_messages", "sender_id");

  /* ─── Seed demo data if DB is empty ─── */
  const adsCount = await get("SELECT COUNT(*) as count FROM ads");
  if (Number(adsCount.count) === 0) {
    await seedDemoData();
  }
}

/* ─── Helper: safe ADD COLUMN ─── */
async function safeAddColumn(table, column, definition) {
  try {
    await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch (_error) {
    // Column already exists — ignore
  }
}

/* ─── Helper: safe CREATE INDEX ─── */
async function safeCreateIndex(name, table, columns) {
  try {
    await run(`CREATE INDEX ${name} ON ${table}(${columns})`);
  } catch (_error) {
    // Index already exists — ignore
  }
}

/* ─── Seed demo data ─── */
async function seedDemoData() {
  const passwordHash = await bcrypt.hash("Demo12345", 10);
  const userResult = await run(
    `INSERT INTO users (name, email, university, password_hash, is_verified) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    ["Demo User", "demo@aqsha.kz", DEFAULT_UNIVERSITY, passwordHash, 1]
  );
  const userId = userResult.lastID;

  const demoAds = [
    {
      title: "Сделаю презентацию за вечер",
      category: CATEGORIES[1],
      price: 9000,
      description: "Чистый дизайн, структура по дедлайну и правки до финала.",
      phone: "+7 777 111 22 33",
      telegram: "@aqsha_designer",
    },
    {
      title: "Куизы/NEO отвечаю",
      category: CATEGORIES[2],
      price: 7000,
      description: "Помогу с квизами, тестами и NEO A1/A2. Быстро и аккуратно.",
      whatsapp: "+7 701 555 10 10",
    },
    {
      title: "Сдам микронаушник для экзамена",
      category: CATEGORIES[3],
      price: 0,
      description: "Аренда микронаушника/петлички на экзамен, есть инструкции.",
      telegram: "@aqsha_micro",
    },
  ];

  for (const ad of demoAds) {
    const adResult = await run(
      `INSERT INTO ads (
        user_id, title, category, price, university, description,
        contact_phone, contact_whatsapp, contact_telegram
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [
        userId,
        ad.title,
        ad.category,
        ad.price,
        DEFAULT_UNIVERSITY,
        ad.description,
        ad.phone || "",
        ad.whatsapp || "",
        ad.telegram || "",
      ]
    );

    await run(`INSERT INTO images (ad_id, url) VALUES ($1, $2)`, [adResult.lastID, DEMO_IMAGE]);
  }

  const demoServices = [
    {
      title: "Сделаю учебные работы под ключ",
      category: CATEGORIES[0],
      price: 15000,
      description: "Презентации, рефераты, эссе, доклады, БӨЖ/БОӨЖ.",
    },
    {
      title: "Помогу с квизами и NEO",
      category: CATEGORIES[2],
      price: 8000,
      description: "Куизы/тесты/NEO A1/A2, ответы на сессию.",
    },
  ];

  for (const service of demoServices) {
    const serviceResult = await run(
      `INSERT INTO services (
        user_id, title, category, price, university, description
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        userId,
        service.title,
        service.category,
        service.price,
        DEFAULT_UNIVERSITY,
        service.description,
      ]
    );

    await run(`INSERT INTO service_images (service_id, url) VALUES ($1, $2)`, [
      serviceResult.lastID,
      DEMO_IMAGE,
    ]);
  }
}

module.exports = {
  initDb,
};
