const { Router } = require("express");
const { authMiddleware } = require("../middleware/auth");

const streamRouter = Router();

// Map userId -> Set of response objects (SSE connections)
const clients = new Map();

function sendEventToUser(userId, event, data) {
  const userClients = clients.get(userId);
  if (!userClients) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of userClients) {
    res.write(payload);
  }
}

streamRouter.get(
  "/stream",
  authMiddleware,
  (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    res.write(":\n\n"); // comment to keep connection alive

    const userId = req.user.id;
    if (!clients.has(userId)) {
      clients.set(userId, new Set());
    }
    clients.get(userId).add(res);

    req.on("close", () => {
      const userClients = clients.get(userId);
      if (userClients) {
        userClients.delete(res);
        if (userClients.size === 0) {
          clients.delete(userId);
        }
      }
    });
  }
);

module.exports = { streamRouter, sendEventToUser };
