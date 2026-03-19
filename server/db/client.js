const { Pool } = require("pg");
const { DATABASE_URL } = require("../config");

const pool = new Pool({
  connectionString: DATABASE_URL,
});

/**
 * Execute a query that modifies data (INSERT, UPDATE, DELETE).
 * Returns { rowCount, rows, lastID } where lastID is populated
 * when the query contains RETURNING id.
 */
async function run(sql, params = []) {
  const result = await pool.query(sql, params);
  return {
    rowCount: result.rowCount,
    rows: result.rows,
    lastID: result.rows.length > 0 && result.rows[0].id !== undefined
      ? result.rows[0].id
      : null,
  };
}

/**
 * Execute a SELECT and return all rows.
 */
async function all(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

/**
 * Execute a SELECT and return the first row or undefined.
 */
async function get(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows[0] || undefined;
}

/**
 * End the pool (graceful shutdown).
 */
async function close() {
  await pool.end();
}

module.exports = {
  pool,
  run,
  all,
  get,
  close,
};
