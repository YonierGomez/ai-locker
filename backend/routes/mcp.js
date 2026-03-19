const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb, toBool } = require('../config/database');

const VALID_SORTS = ['title', 'created_at', 'updated_at', 'server_name'];

function parseConfig(configJson) {
  try { return JSON.parse(configJson); } catch { return {}; }
}

async function getTagsFor(db, itemId, itemType) {
  return db('tags').select('tags.*').join('item_tags', 'tags.id', 'item_tags.tag_id').where({ 'item_tags.item_id': itemId, 'item_tags.item_type': itemType });
}

function formatItem(m, tags = []) {
  return { ...m, is_favorite: toBool(m.is_favorite), is_active: toBool(m.is_active), config: parseConfig(m.config_json), tags };
}

router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const { search, transport, favorite, active, sort = 'updated_at', order = 'desc', limit = 50, offset = 0 } = req.query;

    let q = db('mcp_configs').whereNull('deleted_at');
    if (search) q = q.where(b => b.where('title', 'like', `%${search}%`).orWhere('server_name', 'like', `%${search}%`).orWhere('description', 'like', `%${search}%`));
    if (transport) q = q.where({ transport });
    if (favorite === 'true') q = q.where('is_favorite', 1);
    if (active === 'true') q = q.where('is_active', 1);

    const sortCol = VALID_SORTS.includes(sort) ? sort : 'updated_at';
    const rows = await q.orderBy(sortCol, order === 'asc' ? 'asc' : 'desc').limit(parseInt(limit)).offset(parseInt(offset));
    const [{ count }] = await db('mcp_configs').count('id as count');

    const data = await Promise.all(rows.map(async m => formatItem(m, await getTagsFor(db, m.id, 'mcp'))));
    res.json({ data, total: parseInt(count) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/export/active', async (req, res) => {
  try {
    const db = getDb();
    const items = await db('mcp_configs').where({ is_active: 1 });
    const mcpServers = {};
    items.forEach(item => { mcpServers[item.server_name] = parseConfig(item.config_json); });
    res.json({ mcpServers });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const item = await db('mcp_configs').where({ id: req.params.id }).first();
    if (!item) return res.status(404).json({ error: 'MCP config not found' });
    const tags = await getTagsFor(db, req.params.id, 'mcp');
    res.json(formatItem(item, tags));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const { title, server_name, description, config, transport, tags = [] } = req.body;
    if (!title || !server_name) return res.status(400).json({ error: 'Title and server_name are required' });

    const id = uuidv4();
    const now = new Date().toISOString();
    await db('mcp_configs').insert({ id, title, server_name, description: description || null, config_json: JSON.stringify(config || {}), transport: transport || 'stdio', is_active: 1, is_favorite: 0, created_at: now, updated_at: now });

    for (const tagId of tags) {
      await db('item_tags').insert({ item_id: id, item_type: 'mcp', tag_id: tagId }).onConflict(['item_id', 'item_type', 'tag_id']).ignore();
    }

    const item = await db('mcp_configs').where({ id }).first();
    res.status(201).json(formatItem(item, []));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const db = getDb();
    const { title, server_name, description, config, transport, is_active, tags } = req.body;
    const existing = await db('mcp_configs').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'MCP config not found' });

    const updates = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (server_name !== undefined) updates.server_name = server_name;
    if (description !== undefined) updates.description = description;
    if (config !== undefined) updates.config_json = JSON.stringify(config);
    if (transport !== undefined) updates.transport = transport;
    if (is_active !== undefined) updates.is_active = is_active ? 1 : 0;
    await db('mcp_configs').where({ id: req.params.id }).update(updates);

    if (tags !== undefined) {
      await db('item_tags').where({ item_id: req.params.id, item_type: 'mcp' }).delete();
      for (const tagId of tags) {
        await db('item_tags').insert({ item_id: req.params.id, item_type: 'mcp', tag_id: tagId }).onConflict(['item_id', 'item_type', 'tag_id']).ignore();
      }
    }

    const item = await db('mcp_configs').where({ id: req.params.id }).first();
    const itemTags = await getTagsFor(db, req.params.id, 'mcp');
    res.json(formatItem(item, itemTags));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id/favorite', async (req, res) => {
  try {
    const db = getDb();
    const item = await db('mcp_configs').where({ id: req.params.id }).first();
    if (!item) return res.status(404).json({ error: 'MCP config not found' });
    const newFav = item.is_favorite ? 0 : 1;
    await db('mcp_configs').where({ id: req.params.id }).update({ is_favorite: newFav });
    res.json({ is_favorite: toBool(newFav) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id/toggle', async (req, res) => {
  try {
    const db = getDb();
    const item = await db('mcp_configs').where({ id: req.params.id }).first();
    if (!item) return res.status(404).json({ error: 'MCP config not found' });
    const newActive = item.is_active ? 0 : 1;
    await db('mcp_configs').where({ id: req.params.id }).update({ is_active: newActive, updated_at: new Date().toISOString() });
    res.json({ is_active: toBool(newActive) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const db = getDb();
    const count = await db('mcp_configs').whereNull('deleted_at').where({ id: req.params.id }).update({ deleted_at: new Date().toISOString() });
    if (!count) return res.status(404).json({ error: 'MCP config not found' });
    res.json({ success: true, trashed: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
