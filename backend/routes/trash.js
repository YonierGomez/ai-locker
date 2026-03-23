const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');

const TABLES = ['prompts', 'skills', 'steering', 'mcp_configs', 'commands', 'notes'];
const TRASH_DAYS = 5;

router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const allItems = [];

    for (const table of TABLES) {
      const rows = await db(table).whereNotNull('deleted_at').orderBy('deleted_at', 'desc');
      rows.forEach(row => {
        const daysLeft = Math.max(0, TRASH_DAYS - Math.floor((Date.now() - new Date(row.deleted_at).getTime()) / 86400000));
        allItems.push({ ...row, item_type: table, days_until_purge: daysLeft });
      });
    }

    allItems.sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at));
    res.json({ data: allItems, total: allItems.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/count', async (req, res) => {
  try {
    const db = getDb();
    let total = 0;
    for (const table of TABLES) {
      const [{ count }] = await db(table).whereNotNull('deleted_at').count('id as count');
      total += parseInt(count);
    }
    res.json({ total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:type/:id/restore', async (req, res) => {
  try {
    const { type, id } = req.params;
    if (!TABLES.includes(type)) return res.status(400).json({ error: 'Invalid type' });
    const db = getDb();
    const count = await db(type).whereNotNull('deleted_at').where({ id }).update({ deleted_at: null });
    if (!count) return res.status(404).json({ error: 'Item not found in trash' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    if (!TABLES.includes(type)) return res.status(400).json({ error: 'Invalid type' });
    const db = getDb();
    const itemType = type === 'mcp_configs' ? 'mcp' : type;
    await db('item_tags').where({ item_id: id, item_type: itemType }).delete();
    const count = await db(type).whereNotNull('deleted_at').where({ id }).delete();
    if (!count) return res.status(404).json({ error: 'Item not found in trash' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/', async (req, res) => {
  try {
    const db = getDb();
    let deleted = 0;
    for (const table of TABLES) {
      const itemType = table === 'mcp_configs' ? 'mcp' : table;
      const ids = (await db(table).whereNotNull('deleted_at').select('id')).map(r => r.id);
      for (const id of ids) await db('item_tags').where({ item_id: id, item_type: itemType }).delete();
      const count = await db(table).whereNotNull('deleted_at').delete();
      deleted += count;
    }
    res.json({ success: true, deleted });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/cleanup', async (req, res) => {
  try {
    const db = getDb();
    const cutoff = new Date(Date.now() - TRASH_DAYS * 86400000).toISOString();
    let deleted = 0;
    for (const table of TABLES) {
      const itemType = table === 'mcp_configs' ? 'mcp' : table;
      const ids = (await db(table).whereNotNull('deleted_at').where('deleted_at', '<', cutoff).select('id')).map(r => r.id);
      for (const id of ids) await db('item_tags').where({ item_id: id, item_type: itemType }).delete();
      const count = await db(table).whereNotNull('deleted_at').where('deleted_at', '<', cutoff).delete();
      deleted += count;
    }
    res.json({ success: true, deleted, cutoff });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
module.exports.TRASH_DAYS = TRASH_DAYS;
module.exports.TABLES = TABLES;
