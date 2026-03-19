const express = require('express');
const router = express.Router();
const { getDb, dbType } = require('../config/database');

function getS3Client(settings) {
  const { S3Client } = require('@aws-sdk/client-s3');
  const config = { region: settings.s3_region || 'us-east-1' };
  if (settings.s3_access_key && settings.s3_secret_key) {
    config.credentials = { accessKeyId: settings.s3_access_key, secretAccessKey: settings.s3_secret_key };
  }
  const endpoint = settings.s3_endpoint || settings.endpoint;
  if (endpoint) {
    config.endpoint = endpoint;
    config.forcePathStyle = true;
  }
  return new S3Client(config);
}

async function getSettings() {
  const db = getDb();
  const rows = await db('settings').select('*');
  const s = {};
  rows.forEach(r => { s[r.key] = r.value; });
  return s;
}

function normalizePrefix(prefix) {
  const p = (prefix || 'promptly-backups/').trim();
  return p.endsWith('/') ? p : `${p}/`;
}

function getS3Key(settings, filename) {
  return `${normalizePrefix(settings.s3_prefix)}${filename}`;
}

async function exportAllData(db) {
  const [prompts, skills, steering, mcp_configs, commands, tags, categories, item_tags] = await Promise.all([
    db('prompts').select('*'),
    db('skills').select('*'),
    db('steering').select('*'),
    db('mcp_configs').select('*'),
    db('commands').select('*'),
    db('tags').select('*'),
    db('categories').select('*'),
    db('item_tags').select('*'),
  ]);
  return { version: '1.0', exported_at: new Date().toISOString(), prompts, skills, steering, mcp_configs, commands, tags, categories, item_tags };
}

async function importData(db, data, merge) {
  return db.transaction(async trx => {
    if (!merge) {
      await trx('item_tags').delete();
      await trx('prompts').delete();
      await trx('skills').delete();
      await trx('steering').delete();
      await trx('mcp_configs').delete();
      await trx('commands').delete();
      await trx('tags').delete();
      await trx('categories').whereRaw("id NOT LIKE 'cat-%'").delete();
    }

    const counts = { prompts: 0, skills: 0, steering: 0, mcp_configs: 0, commands: 0, tags: 0, categories: 0 };

    if (data.tags?.length) {
      for (const t of data.tags) {
        await trx('tags').insert({ id: t.id, name: t.name, color: t.color, created_at: t.created_at }).onConflict('id').merge();
        counts.tags++;
      }
    }

    if (data.categories?.length) {
      for (const c of data.categories) {
        await trx('categories').insert({ id: c.id, name: c.name, color: c.color, icon: c.icon, item_type: c.item_type, created_at: c.created_at }).onConflict('id').merge();
        counts.categories++;
      }
    }

    if (data.prompts?.length) {
      for (const p of data.prompts) {
        await trx('prompts').insert({ id: p.id, title: p.title, content: p.content, description: p.description, category: p.category, model: p.model, temperature: p.temperature, max_tokens: p.max_tokens, is_favorite: p.is_favorite, use_count: p.use_count, created_at: p.created_at, updated_at: p.updated_at }).onConflict('id').merge();
        counts.prompts++;
      }
    }

    if (data.skills?.length) {
      for (const s of data.skills) {
        await trx('skills').insert({ id: s.id, title: s.title, content: s.content, description: s.description, category: s.category, trigger_phrase: s.trigger_phrase, is_active: s.is_active, is_favorite: s.is_favorite, use_count: s.use_count, created_at: s.created_at, updated_at: s.updated_at }).onConflict('id').merge();
        counts.skills++;
      }
    }

    if (data.steering?.length) {
      for (const s of data.steering) {
        await trx('steering').insert({ id: s.id, title: s.title, content: s.content, description: s.description, category: s.category, scope: s.scope, priority: s.priority, is_active: s.is_active, is_favorite: s.is_favorite, created_at: s.created_at, updated_at: s.updated_at }).onConflict('id').merge();
        counts.steering++;
      }
    }

    if (data.mcp_configs?.length) {
      for (const m of data.mcp_configs) {
        await trx('mcp_configs').insert({ id: m.id, title: m.title, server_name: m.server_name, description: m.description, config_json: m.config_json, transport: m.transport, is_active: m.is_active, is_favorite: m.is_favorite, created_at: m.created_at, updated_at: m.updated_at }).onConflict('id').merge();
        counts.mcp_configs++;
      }
    }

    if (data.commands?.length) {
      for (const c of data.commands) {
        await trx('commands').insert({ id: c.id, title: c.title, command: c.command, description: c.description, shell: c.shell, platform: c.platform, category: c.category, is_favorite: c.is_favorite, use_count: c.use_count, created_at: c.created_at, updated_at: c.updated_at }).onConflict('id').merge();
        counts.commands++;
      }
    }

    if (data.item_tags?.length) {
      for (const it of data.item_tags) {
        await trx('item_tags').insert({ item_id: it.item_id, item_type: it.item_type, tag_id: it.tag_id }).onConflict(['item_id', 'item_type', 'tag_id']).ignore();
      }
    }

    return counts;
  });
}

// ── Export DB file (SQLite only) — removed, use /export/json instead ──

// ── Export all data as JSON ──────────────────────────────────
router.get('/export/json', async (req, res) => {
  try {
    const db = getDb();
    const data = await exportAllData(db);
    const filename = `promptly-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Import JSON data ─────────────────────────────────────────
router.post('/import/json', express.json({ limit: '50mb' }), async (req, res) => {
  try {
    const db = getDb();
    const data = req.body;
    if (!data.version || !data.prompts) return res.status(400).json({ error: 'Invalid backup format' });
    const merge = req.query.merge === 'true' || req.query.merge === true;
    const counts = await importData(db, data, merge);
    res.json({ success: true, imported: counts });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── S3: Upload backup ────────────────────────────────────────
router.post('/s3/upload', async (req, res) => {
  try {
    const settings = await getSettings();
    if (!settings.s3_bucket) return res.status(400).json({ error: 'S3 bucket not configured' });

    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    const s3 = getS3Client(settings);
    const db = getDb();

    const data = await exportAllData(db);
    const filename = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const body = JSON.stringify(data);

    await s3.send(new PutObjectCommand({ Bucket: settings.s3_bucket, Key: getS3Key(settings, filename), Body: body, ContentType: 'application/json' }));
    await s3.send(new PutObjectCommand({ Bucket: settings.s3_bucket, Key: getS3Key(settings, 'latest.json'), Body: body, ContentType: 'application/json' }));

    const now = new Date().toISOString();
    await db('settings').insert({ key: 'last_s3_sync', value: now, updated_at: now }).onConflict('key').merge();

    res.json({ success: true, key: getS3Key(settings, filename), bucket: settings.s3_bucket });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── S3: List backups ─────────────────────────────────────────
router.get('/s3/list', async (req, res) => {
  try {
    const settings = await getSettings();
    if (!settings.s3_bucket) return res.status(400).json({ error: 'S3 bucket not configured' });

    const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
    const s3 = getS3Client(settings);
    const result = await s3.send(new ListObjectsV2Command({ Bucket: settings.s3_bucket, Prefix: normalizePrefix(settings.s3_prefix), MaxKeys: 50 }));

    const files = (result.Contents || [])
      .filter(f => f.Key.endsWith('.json'))
      .sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified))
      .map(f => ({ key: f.Key, size: f.Size, last_modified: f.LastModified, filename: f.Key.split('/').pop() }));

    res.json({ data: files });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── S3: Restore from backup ──────────────────────────────────
router.post('/s3/restore', async (req, res) => {
  try {
    const settings = await getSettings();
    if (!settings.s3_bucket) return res.status(400).json({ error: 'S3 bucket not configured' });

    const { key, merge = false } = req.body;
    if (!key) return res.status(400).json({ error: 'S3 key is required' });

    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    const s3 = getS3Client(settings);
    const result = await s3.send(new GetObjectCommand({ Bucket: settings.s3_bucket, Key: key }));

    const chunks = [];
    for await (const chunk of result.Body) chunks.push(chunk);
    const data = JSON.parse(Buffer.concat(chunks).toString('utf-8'));

    if (!data.version || !data.prompts) return res.status(400).json({ error: 'Invalid backup format' });

    const db = getDb();
    const counts = await importData(db, data, merge);
    res.json({ success: true, imported: counts, from: key });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── S3: Test connection ──────────────────────────────────────
router.post('/s3/test', async (req, res) => {
  try {
    const { bucket, region, access_key, secret_key, endpoint } = req.body;
    if (!bucket) return res.status(400).json({ error: 'Bucket is required' });

    const { HeadBucketCommand } = require('@aws-sdk/client-s3');
    const s3 = getS3Client({ s3_region: region, s3_access_key: access_key, s3_secret_key: secret_key, s3_endpoint: endpoint });
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    res.json({ success: true, message: 'S3 connection successful' });
  } catch (err) {
    res.status(400).json({ error: `S3 connection failed: ${err.message}` });
  }
});

// ── S3: Status ───────────────────────────────────────────────
router.get('/s3/status', async (req, res) => {
  try {
    const settings = await getSettings();
    res.json({
      configured: !!(settings.s3_bucket),
      bucket: settings.s3_bucket || null,
      region: settings.s3_region || 'us-east-1',
      prefix: settings.s3_prefix || 'promptly-backups/',
      endpoint: settings.s3_endpoint || null,
      sync_enabled: settings.sync_enabled === 'true',
      sync_interval: parseInt(settings.sync_interval) || 60,
      last_sync: settings.last_s3_sync || null,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
