const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { getDb, toBool } = require('../config/database');

// AES-256-GCM encryption using API_KEY as seed
const ENCRYPTION_KEY = (() => {
  const seed = process.env.API_KEY || process.env.VAULT_SECRET || 'default-vault-secret-change-me';
  return crypto.createHash('sha256').update(seed).digest(); // 32 bytes
})();

function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decrypt(data) {
  const buf = Buffer.from(data, 'base64');
  const iv = buf.slice(0, 12);
  const tag = buf.slice(12, 28);
  const encrypted = buf.slice(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

function formatEntry(e, reveal = false) {
  return {
    id: e.id,
    name: e.name,
    label: e.label,
    description: e.description,
    type: e.type,
    is_favorite: toBool(e.is_favorite),
    created_at: e.created_at,
    updated_at: e.updated_at,
    value: reveal ? decrypt(e.value_encrypted) : null,
  };
}

// GET /vault — list (never returns values)
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const { search, type, favorite, sort = 'updated_at', order = 'desc' } = req.query;
    let q = db('vault').whereNull('deleted_at');
    if (search) q = q.where(b => b.where('label', 'like', `%${search}%`).orWhere('name', 'like', `%${search}%`).orWhere('description', 'like', `%${search}%`));
    if (type) q = q.where({ type });
    if (favorite === 'true') q = q.where('is_favorite', 1);
    const rows = await q.orderBy(sort === 'label' ? 'label' : 'updated_at', order === 'asc' ? 'asc' : 'desc');
    const [{ count }] = await db('vault').whereNull('deleted_at').count('id as count');
    res.json({ data: rows.map(e => formatEntry(e, false)), total: parseInt(count) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /vault/:id/reveal — returns decrypted value
router.get('/:id/reveal', async (req, res) => {
  try {
    const db = getDb();
    const entry = await db('vault').where({ id: req.params.id }).whereNull('deleted_at').first();
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    res.json({ value: decrypt(entry.value_encrypted) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /vault
router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const { label, name, value, description, type = 'secret' } = req.body;
    if (!label || !value) return res.status(400).json({ error: 'Label and value are required' });
    // Normalize name: uppercase, spaces to underscores
    const normalizedName = (name || label).toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    // Check unique name
    const existing = await db('vault').where({ name: normalizedName }).whereNull('deleted_at').first();
    if (existing) return res.status(409).json({ error: `Variable name "${normalizedName}" already exists` });
    const now = new Date().toISOString();
    const id = uuidv4();
    await db('vault').insert({ id, name: normalizedName, label, value_encrypted: encrypt(value), description, type, is_favorite: 0, created_at: now, updated_at: now });
    const entry = await db('vault').where({ id }).first();
    res.status(201).json(formatEntry(entry, false));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /vault/:id
router.put('/:id', async (req, res) => {
  try {
    const db = getDb();
    const { label, name, value, description, type } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (label !== undefined) updates.label = label;
    if (name !== undefined) updates.name = name.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    if (value !== undefined) updates.value_encrypted = encrypt(value);
    if (description !== undefined) updates.description = description;
    if (type !== undefined) updates.type = type;
    await db('vault').where({ id: req.params.id }).update(updates);
    const entry = await db('vault').where({ id: req.params.id }).first();
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    res.json(formatEntry(entry, false));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /vault/:id/favorite
router.patch('/:id/favorite', async (req, res) => {
  try {
    const db = getDb();
    const entry = await db('vault').where({ id: req.params.id }).first();
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    await db('vault').where({ id: req.params.id }).update({ is_favorite: entry.is_favorite ? 0 : 1, updated_at: new Date().toISOString() });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /vault/:id
router.delete('/:id', async (req, res) => {
  try {
    const db = getDb();
    await db('vault').where({ id: req.params.id }).update({ deleted_at: new Date().toISOString() });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /vault/resolve — resolves {{VAR_NAME}} in a given text
router.post('/resolve', async (req, res) => {
  try {
    const db = getDb();
    const { text } = req.body;
    if (!text) return res.json({ resolved: text });
    const vars = [...text.matchAll(/\{\{([A-Z0-9_]+)\}\}/g)].map(m => m[1]);
    if (!vars.length) return res.json({ resolved: text });
    const entries = await db('vault').whereIn('name', vars).whereNull('deleted_at');
    let resolved = text;
    for (const entry of entries) {
      resolved = resolved.replaceAll(`{{${entry.name}}}`, decrypt(entry.value_encrypted));
    }
    res.json({ resolved });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
