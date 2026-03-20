const { forbidden } = require("../lib/http-error");

function requireAdmin(req, _res, next) {
  if (!req.user || !req.user.isAdmin) {
    return next(forbidden("Доступ только для администраторов"));
  }
  next();
}

module.exports = { requireAdmin };
