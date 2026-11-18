const { Pool } = require('pg');
const { databaseConfig } = require('./db-config.cjs');
let pool, ready;
function db() {
  if (!pool) {
    const connectionString = process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
    pool = new Pool(databaseConfig(connectionString));
  }
  return pool;
}
const schema = `
CREATE SCHEMA IF NOT EXISTS image_manager;
CREATE TABLE IF NOT EXISTS image_manager.admin (
 id int PRIMARY KEY CHECK(id=1), username text NOT NULL, password_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS image_manager.sessions (
 token_hash text PRIMARY KEY, expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS image_manager.limits (
 key text PRIMARY KEY, hits int NOT NULL DEFAULT 1, reset_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS image_manager.uploads (
 id uuid PRIMARY KEY, path text NOT NULL, filename text NOT NULL,
 declared_bytes bigint NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 status text NOT NULL DEFAULT 'pending');
CREATE TABLE IF NOT EXISTS image_manager.images (
 id uuid PRIMARY KEY, path text NOT NULL, source_hash text NOT NULL UNIQUE,
 output_hash text NOT NULL, filename text NOT NULL, title text NOT NULL DEFAULT '', alt text NOT NULL DEFAULT '',
 original_bytes bigint NOT NULL, bytes int NOT NULL CHECK(bytes BETWEEN 1 AND 307200),
 original_width int NOT NULL, original_height int NOT NULL,
 width int NOT NULL, height int NOT NULL, format text NOT NULL,
 slot text NOT NULL, published boolean NOT NULL DEFAULT false,
 position int NOT NULL DEFAULT 0, version int NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS image_manager_images_slot ON image_manager.images(slot, position, created_at);
REVOKE ALL ON SCHEMA image_manager FROM PUBLIC;
`;
async function init() {
  if (!ready) ready = (async()=>{
    const client=await db().connect();
    try {await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(726310914)');await client.query(schema);await client.query('COMMIT');}
    catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  })().catch(e => {ready = null; throw e;});
  return ready;
}
async function query(sql, args=[]) {await init(); return db().query(sql,args);}
module.exports = {db,query,init,schema};
