class HttpError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

function badRequest(message = "Bad Request") {
  return new HttpError(message, 400);
}

function unauthorized(message = "Unauthorized") {
  return new HttpError(message, 401);
}

function forbidden(message = "Forbidden") {
  return new HttpError(message, 403);
}

function notFound(message = "Not Found") {
  return new HttpError(message, 404);
}

module.exports = { HttpError, badRequest, unauthorized, forbidden, notFound };
