const knex = require('knex');
const path = require('path');
const fs = require('fs');

let _db = null;

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/prompts.db');

// Build a Knex config from the available environment variables.
// Priority: DATABASE_URL > DB_HOST (individual vars) > SQLite (default)
function resolveKnexConfig() {
  const { DATABASE_URL, DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_TYPE } = process.env;

  // Option 1 — connection string
  if (DATABASE_URL) {
    let client;
    if (DATABASE_URL.startsWith('postgres://') || DATABASE_URL.startsWith('postgresql://')) client = 'pg';
    else if (DATABASE_URL.startsWith('mysql://') || DATABASE_URL.startsWith('mariadb://')) client = 'mysql2';
    else if (DATABASE_URL.startsWith('sqlite:')) client = 'better-sqlite3';
    else client = 'pg'; // assume postgres if no recognisable prefix

    const masked = DATABASE_URL.replace(/:[^:@]*@/, ':***@');
    console.log(`🗄️  ${client} → ${masked}`);
    return { client, connection: DATABASE_URL, pool: { min: 2, max: 10 } };
  }

  // Option 2 — individual host/user/password vars (DB_HOST must be set)
  if (DB_HOST) {
    const type = (DB_TYPE || 'postgres').toLowerCase();
    const client = (type === 'mysql' || type === 'mariadb') ? 'mysql2' : 'pg';
    const connection = {
      host:     DB_HOST,
      port:     parseInt(DB_PORT || (client === 'pg' ? '5432' : '3306')),
      database: DB_NAME     || 'promptly',
      user:     DB_USER     || 'promptly',
      password: DB_PASSWORD || '',
    };
    console.log(`🗄️  ${client} → ${connection.user}@${connection.host}:${connection.port}/${connection.database}`);
    return { client, connection, pool: { min: 2, max: 10 } };
  }

  // Option 3 — SQLite (default, no external DB configured)
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  console.log(`🗄️  SQLite → ${DB_PATH}`);
  return { client: 'better-sqlite3', connection: { filename: DB_PATH }, useNullAsDefault: true };
}

function getDb() {
  if (_db) return _db;
  _db = knex(resolveKnexConfig());
  return _db;
}

// Helper: detect which SQL client is active
function dbType() {
  const client = getDb().client.config.client;
  if (client === 'pg') return 'pg';
  if (client === 'mysql2') return 'mysql';
  return 'sqlite';
}

// Helper: normalize boolean fields from DB (0/1 or true/false)
function toBool(val) {
  if (val === true || val === 1) return true;
  if (val === false || val === 0) return false;
  return Boolean(val);
}

// Helper: unique constraint error detection across DBs
function isUniqueError(err) {
  return (
    err.code === '23505' ||       // PostgreSQL
    err.code === 'ER_DUP_ENTRY' || // MySQL/MariaDB
    (err.message && (err.message.includes('UNIQUE') || err.message.includes('unique')))
  );
}

async function initDatabase() {
  const db = getDb();
  const now = new Date().toISOString();

  const ensure = async (tableName, builder) => {
    const exists = await db.schema.hasTable(tableName);
    if (!exists) await db.schema.createTable(tableName, builder);
  };

  await ensure('prompts', t => {
    t.string('id').primary();
    t.string('title').notNullable();
    t.text('content').notNullable();
    t.text('description');
    t.string('category').defaultTo('general');
    t.string('model');
    t.float('temperature').defaultTo(0.7);
    t.integer('max_tokens');
    t.integer('is_favorite').defaultTo(0);
    t.integer('use_count').defaultTo(0);
    t.string('created_at');
    t.string('updated_at');
    t.string('deleted_at');
    t.index(['category']);
    t.index(['is_favorite']);
  });

  await ensure('skills', t => {
    t.string('id').primary();
    t.string('title').notNullable();
    t.text('content').notNullable();
    t.text('description');
    t.string('category').defaultTo('general');
    t.string('trigger_phrase');
    t.integer('is_active').defaultTo(1);
    t.integer('is_favorite').defaultTo(0);
    t.integer('use_count').defaultTo(0);
    t.string('created_at');
    t.string('updated_at');
    t.string('deleted_at');
    t.index(['category']);
  });

  await ensure('steering', t => {
    t.string('id').primary();
    t.string('title').notNullable();
    t.text('content').notNullable();
    t.text('description');
    t.string('category').defaultTo('general');
    t.string('scope').defaultTo('global');
    t.integer('priority').defaultTo(0);
    t.integer('is_active').defaultTo(1);
    t.integer('is_favorite').defaultTo(0);
    t.string('created_at');
    t.string('updated_at');
    t.string('deleted_at');
    t.index(['scope']);
  });

  await ensure('mcp_configs', t => {
    t.string('id').primary();
    t.string('title').notNullable();
    t.string('server_name').notNullable();
    t.text('description');
    t.text('config_json').notNullable();
    t.string('transport').defaultTo('stdio');
    t.integer('is_active').defaultTo(1);
    t.integer('is_favorite').defaultTo(0);
    t.string('created_at');
    t.string('updated_at');
    t.string('deleted_at');
    t.index(['is_active']);
  });

  await ensure('commands', t => {
    t.string('id').primary();
    t.string('title').notNullable();
    t.text('command').notNullable();
    t.text('description');
    t.string('shell').defaultTo('bash');
    t.string('platform').defaultTo('all');
    t.string('category').defaultTo('general');
    t.integer('is_favorite').defaultTo(0);
    t.integer('use_count').defaultTo(0);
    t.string('created_at');
    t.string('updated_at');
    t.string('deleted_at');
    t.index(['category']);
    t.index(['shell']);
    t.index(['platform']);
  });

  await ensure('snippets', t => {
    t.string('id').primary();
    t.string('title').notNullable();
    t.text('code').notNullable();
    t.text('description');
    t.string('language').defaultTo('javascript');
    t.string('category').defaultTo('general');
    t.integer('is_favorite').defaultTo(0);
    t.integer('use_count').defaultTo(0);
    t.string('created_at');
    t.string('updated_at');
    t.string('deleted_at');
    t.index(['language']);
    t.index(['category']);
    t.index(['is_favorite']);
  });

  await ensure('agents', t => {
    t.string('id').primary();
    t.string('title').notNullable();
    t.text('description');
    t.string('model').defaultTo('');
    t.float('temperature').defaultTo(0.7);
    t.integer('max_tokens');
    t.text('system_prompt').defaultTo('');
    t.text('initial_prompt').defaultTo('');
    t.string('avatar_emoji').defaultTo('🤖');
    t.text('mcp_ids').defaultTo('[]');
    t.text('skill_ids').defaultTo('[]');
    t.text('steering_ids').defaultTo('[]');
    t.integer('is_active').defaultTo(1);
    t.integer('is_favorite').defaultTo(0);
    t.string('created_at');
    t.string('updated_at');
    t.string('deleted_at');
    t.index(['is_active']);
    t.index(['is_favorite']);
  });

  await ensure('notes', t => {
    t.string('id').primary();
    t.string('title').notNullable();
    t.text('content').defaultTo('');
    t.text('description');
    t.string('category').defaultTo('general');
    t.string('color').defaultTo('#FFD60A');
    t.integer('is_favorite').defaultTo(0);
    t.integer('is_pinned').defaultTo(0);
    t.string('created_at');
    t.string('updated_at');
    t.string('deleted_at');
    t.index(['category']);
    t.index(['is_favorite']);
    t.index(['is_pinned']);
  });

  await ensure('tags', t => {
    t.string('id').primary();
    t.string('name').notNullable().unique();
    t.string('color').defaultTo('#6366f1');
    t.string('created_at');
  });

  await ensure('item_tags', t => {
    t.string('item_id').notNullable();
    t.string('item_type').notNullable();
    t.string('tag_id').notNullable();
    t.primary(['item_id', 'item_type', 'tag_id']);
    t.index(['item_id', 'item_type']);
  });

  await ensure('categories', t => {
    t.string('id').primary();
    t.string('name').notNullable().unique();
    t.string('color').defaultTo('#6366f1');
    t.string('icon').defaultTo('tag');
    t.string('item_type').defaultTo('all');
    t.string('created_at');
  });

  await ensure('settings', t => {
    t.string('key').primary();
    t.text('value').notNullable();
    t.string('updated_at');
  });

  await ensure('item_versions', t => {
    t.string('id').primary();
    t.string('item_id').notNullable();
    t.string('item_type').notNullable(); // prompt | skill | steering
    t.text('snapshot').notNullable(); // full JSON snapshot of the item
    t.string('created_at');
    t.index(['item_id', 'item_type']);
  });

  // Migrate existing SQLite DBs that might be missing deleted_at
  for (const table of ['prompts', 'skills', 'steering', 'mcp_configs']) {
    const has = await db.schema.hasColumn(table, 'deleted_at');
    if (!has) await db.schema.alterTable(table, t => t.string('deleted_at').nullable());
  }

  // Default settings
  const defaults = [
    { key: 'theme', value: 'dark' },
    { key: 'accent_color', value: '#007AFF' },
    { key: 'default_model', value: 'claude-sonnet-4-6' },
    { key: 'app_name', value: 'AI Locker' },
    { key: 'app_logo', value: '' },
    { key: 's3_bucket', value: '' },
    { key: 's3_region', value: 'us-east-1' },
    { key: 's3_prefix', value: 'promptly-backups/' },
    { key: 's3_access_key', value: '' },
    { key: 's3_secret_key', value: '' },
    { key: 's3_endpoint', value: '' },
    { key: 'sync_enabled', value: 'false' },
    { key: 'sync_interval', value: '60' },
    { key: 'ai_provider', value: 'openrouter' },
    { key: 'ai_api_key', value: '' },
    { key: 'ai_base_url', value: 'https://openrouter.ai/api/v1' },
    { key: 'ai_model', value: 'openai/gpt-4o-mini' },
    { key: 'ai_aws_region', value: 'us-east-1' },
    { key: 'ai_aws_access_key_id', value: '' },
    { key: 'ai_aws_secret_access_key', value: '' },
  ];
  for (const s of defaults) {
    await db('settings').insert({ ...s, updated_at: now }).onConflict('key').ignore();
  }

  // Default categories
  const cats = [
    { id: 'cat-general',  name: 'general',  color: '#8E8E93', icon: 'tag',      item_type: 'all' },
    { id: 'cat-coding',   name: 'coding',   color: '#007AFF', icon: 'code',     item_type: 'all' },
    { id: 'cat-writing',  name: 'writing',  color: '#BF5AF2', icon: 'pen',      item_type: 'all' },
    { id: 'cat-analysis', name: 'analysis', color: '#5AC8FA', icon: 'chart',    item_type: 'all' },
    { id: 'cat-creative', name: 'creative', color: '#FF9F0A', icon: 'sparkles', item_type: 'all' },
    { id: 'cat-system',   name: 'system',   color: '#30D158', icon: 'settings', item_type: 'all' },
    { id: 'cat-research', name: 'research', color: '#FF375F', icon: 'search',   item_type: 'all' },
  ];
  for (const c of cats) {
    await db('categories').insert({ ...c, created_at: now }).onConflict('id').ignore();
  }

  const type = dbType();
  const label = type === 'sqlite' ? `SQLite (${DB_PATH})` : type;
  console.log(`✅ Database initialized (${label})`);
}

module.exports = { getDb, initDatabase, DB_PATH, dbType, toBool, isUniqueError };
