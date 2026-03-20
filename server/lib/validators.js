const { badRequest } = require("./http-error");

function normalizeText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function optionalText(value, opts = {}) {
  const text = normalizeText(value);
  if (!text) return "";
  const { max = 1000 } = opts;
  if (text.length > max) {
    throw badRequest(`Текст слишком длинный (макс. ${max} символов)`);
  }
  return text;
}

function requireText(value, fieldName = "Поле", opts = {}) {
  const text = normalizeText(value);
  const { min = 1, max = 1000 } = opts;
  if (!text || text.length < min) {
    throw badRequest(`${fieldName} обязательно (мин. ${min} символов)`);
  }
  if (text.length > max) {
    throw badRequest(`${fieldName} слишком длинное (макс. ${max} символов)`);
  }
  return text;
}

function requireEmail(value) {
  const email = normalizeText(value).toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw badRequest("Введите корректный email");
  }
  return email;
}

function requirePassword(value) {
  const password = String(value || "");
  if (password.length < 6) {
    throw badRequest("Пароль должен быть не менее 6 символов");
  }
  return password;
}

function parsePositiveInt(value, fieldName = "Поле") {
  const num = parseInt(value, 10);
  if (!Number.isFinite(num) || num <= 0) {
    throw badRequest(`${fieldName} должно быть положительным числом`);
  }
  return num;
}

function parsePrice(value) {
  const num = parseInt(value, 10);
  if (!Number.isFinite(num) || num < 0) {
    throw badRequest("Цена должна быть неотрицательным числом");
  }
  return num;
}

function parseLimit(value, defaultLimit = 24) {
  if (value === undefined || value === null || value === "") return defaultLimit;
  const num = parseInt(value, 10);
  if (!Number.isFinite(num) || num < 1) return defaultLimit;
  return Math.min(num, 100);
}

module.exports = {
  normalizeText,
  optionalText,
  requireText,
  requireEmail,
  requirePassword,
  parsePositiveInt,
  parsePrice,
  parseLimit,
};
