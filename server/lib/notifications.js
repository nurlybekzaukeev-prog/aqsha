const { run } = require("../db/client");

async function createNotification(userId, type, title, body, link = "") {
  if (!userId) return;
  await run(
    "INSERT INTO notifications (user_id, type, title, body, link) VALUES ($1, $2, $3, $4, $5)",
    [userId, type, title, body, link]
  );
}

module.exports = {
  createNotification,
};
