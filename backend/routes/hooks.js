const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb, toBool } = require('../config/database');

const VALID_SORTS = ['title', 'created_at', 'updated_at', 'event_type'];

function formatHook(h) {
  return {
    ...h,
    is_active: toBool(h.is_active),
    is_favorite: toBool(h.is_favorite),
    file_patterns: h.file_patterns ? JSON.parse(h.file_patterns) : [],
    tool_types: h.tool_types ? JSON.parse(h.tool_types) : [],
  };
}

// GET /hooks
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const { search, event_type, favorite, active, sort = 'updated_at', order = 'desc', limit = 100, offset = 0 } = req.query;

    let q = db('hooks').whereNull('deleted_at');
    if (search) q = q.where(b => b.where('title', 'like', `%${search}%`).orWhere('description', 'like', `%${search}%`));
    if (event_type) q = q.where({ event_type });
    if (favorite === 'true') q = q.where('is_favorite', 1);
    if (active === 'true') q = q.where('is_active', 1);

    const sortCol = VALID_SORTS.includes(sort) ? sort : 'updated_at';
    const rows = await q.orderBy(sortCol, order === 'asc' ? 'asc' : 'desc').limit(parseInt(limit)).offset(parseInt(offset));
    const [{ count }] = await db('hooks').whereNull('deleted_at').count('id as count');

    res.json({ data: rows.map(formatHook), total: parseInt(count) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /hooks/:id
router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const hook = await db('hooks').where({ id: req.params.id }).first();
    if (!hook) return res.status(404).json({ error: 'Hook not found' });
    res.json(formatHook(hook));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /hooks
router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const { title, description, event_type, file_patterns = [], tool_types = [], action_type = 'askAgent', action_prompt, action_command, action_timeout = 60 } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    if (!event_type) return res.status(400).json({ error: 'Event type is required' });

    const now = new Date().toISOString();
    const id = uuidv4();
    await db('hooks').insert({
      id, title, description, event_type,
      file_patterns: JSON.stringify(file_patterns),
      tool_types: JSON.stringify(tool_types),
      action_type, action_prompt, action_command, action_timeout,
      is_active: 1, is_favorite: 0,
      created_at: now, updated_at: now,
    });
    const hook = await db('hooks').where({ id }).first();
    res.status(201).json(formatHook(hook));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /hooks/:id
router.put('/:id', async (req, res) => {
  try {
    const db = getDb();
    const { title, description, event_type, file_patterns, tool_types, action_type, action_prompt, action_command, action_timeout } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (event_type !== undefined) updates.event_type = event_type;
    if (file_patterns !== undefined) updates.file_patterns = JSON.stringify(file_patterns);
    if (tool_types !== undefined) updates.tool_types = JSON.stringify(tool_types);
    if (action_type !== undefined) updates.action_type = action_type;
    if (action_prompt !== undefined) updates.action_prompt = action_prompt;
    if (action_command !== undefined) updates.action_command = action_command;
    if (action_timeout !== undefined) updates.action_timeout = action_timeout;

    await db('hooks').where({ id: req.params.id }).update(updates);
    const hook = await db('hooks').where({ id: req.params.id }).first();
    if (!hook) return res.status(404).json({ error: 'Hook not found' });
    res.json(formatHook(hook));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /hooks/:id/favorite
router.patch('/:id/favorite', async (req, res) => {
  try {
    const db = getDb();
    const hook = await db('hooks').where({ id: req.params.id }).first();
    if (!hook) return res.status(404).json({ error: 'Hook not found' });
    await db('hooks').where({ id: req.params.id }).update({ is_favorite: hook.is_favorite ? 0 : 1, updated_at: new Date().toISOString() });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /hooks/:id/toggle
router.patch('/:id/toggle', async (req, res) => {
  try {
    const db = getDb();
    const hook = await db('hooks').where({ id: req.params.id }).first();
    if (!hook) return res.status(404).json({ error: 'Hook not found' });
    await db('hooks').where({ id: req.params.id }).update({ is_active: hook.is_active ? 0 : 1, updated_at: new Date().toISOString() });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /hooks/:id
router.delete('/:id', async (req, res) => {
  try {
    const db = getDb();
    await db('hooks').where({ id: req.params.id }).update({ deleted_at: new Date().toISOString() });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
