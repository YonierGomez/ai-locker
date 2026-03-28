const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb, toBool } = require('../config/database');

const VALID_SORTS = ['title', 'created_at', 'updated_at'];

function formatAgent(a) {
  return {
    ...a,
    is_favorite: toBool(a.is_favorite),
    is_active: toBool(a.is_active),
    // Parse JSON fields
    mcp_ids: a.mcp_ids ? JSON.parse(a.mcp_ids) : [],
    skill_ids: a.skill_ids ? JSON.parse(a.skill_ids) : [],
    steering_ids: a.steering_ids ? JSON.parse(a.steering_ids) : [],
  };
}

// GET /agents
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const { search, favorite, sort = 'updated_at', order = 'desc', limit = 100, offset = 0 } = req.query;

    let q = db('agents').whereNull('deleted_at');
    if (search) q = q.where(b => b
      .where('title', 'like', `%${search}%`)
      .orWhere('description', 'like', `%${search}%`)
    );
    if (favorite === 'true') q = q.where('is_favorite', 1);

    const sortCol = VALID_SORTS.includes(sort) ? sort : 'updated_at';
    const rows = await q.orderBy(sortCol, order === 'asc' ? 'asc' : 'desc').limit(parseInt(limit)).offset(parseInt(offset));
    const [{ count }] = await db('agents').whereNull('deleted_at').count('id as count');

    res.json({ data: rows.map(formatAgent), total: parseInt(count) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /agents/:id
router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const agent = await db('agents').where({ id: req.params.id }).first();
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json(formatAgent(agent));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /agents
router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const {
      title, description, model, temperature, max_tokens,
      system_prompt, initial_prompt, avatar_emoji,
      mcp_ids = [], skill_ids = [], steering_ids = [],
    } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const id = uuidv4();
    const now = new Date().toISOString();
    await db('agents').insert({
      id, title,
      description: description || null,
      model: model || '',
      temperature: temperature !== undefined ? temperature : 0.7,
      max_tokens: max_tokens || null,
      system_prompt: system_prompt || '',
      initial_prompt: initial_prompt || '',
      avatar_emoji: avatar_emoji || '🤖',
      mcp_ids: JSON.stringify(mcp_ids),
      skill_ids: JSON.stringify(skill_ids),
      steering_ids: JSON.stringify(steering_ids),
      is_active: 1,
      is_favorite: 0,
      created_at: now, updated_at: now,
    });
    const agent = await db('agents').where({ id }).first();
    res.status(201).json(formatAgent(agent));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /agents/:id
router.put('/:id', async (req, res) => {
  try {
    const db = getDb();
    const existing = await db('agents').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'Agent not found' });

    const {
      title, description, model, temperature, max_tokens,
      system_prompt, initial_prompt, avatar_emoji,
      mcp_ids, skill_ids, steering_ids,
    } = req.body;

    const updates = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (model !== undefined) updates.model = model;
    if (temperature !== undefined) updates.temperature = temperature;
    if (max_tokens !== undefined) updates.max_tokens = max_tokens;
    if (system_prompt !== undefined) updates.system_prompt = system_prompt;
    if (initial_prompt !== undefined) updates.initial_prompt = initial_prompt;
    if (avatar_emoji !== undefined) updates.avatar_emoji = avatar_emoji;
    if (mcp_ids !== undefined) updates.mcp_ids = JSON.stringify(mcp_ids);
    if (skill_ids !== undefined) updates.skill_ids = JSON.stringify(skill_ids);
    if (steering_ids !== undefined) updates.steering_ids = JSON.stringify(steering_ids);

    await db('agents').where({ id: req.params.id }).update(updates);
    const agent = await db('agents').where({ id: req.params.id }).first();
    res.json(formatAgent(agent));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /agents/:id/favorite
router.patch('/:id/favorite', async (req, res) => {
  try {
    const db = getDb();
    const agent = await db('agents').where({ id: req.params.id }).first();
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    const newFav = agent.is_favorite ? 0 : 1;
    await db('agents').where({ id: req.params.id }).update({ is_favorite: newFav });
    res.json({ is_favorite: toBool(newFav) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /agents/:id/toggle
router.patch('/:id/toggle', async (req, res) => {
  try {
    const db = getDb();
    const agent = await db('agents').where({ id: req.params.id }).first();
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    const newActive = agent.is_active ? 0 : 1;
    await db('agents').where({ id: req.params.id }).update({ is_active: newActive });
    res.json({ is_active: toBool(newActive) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /agents/:id (soft delete → trash)
router.delete('/:id', async (req, res) => {
  try {
    const db = getDb();
    const count = await db('agents').whereNull('deleted_at').where({ id: req.params.id }).update({ deleted_at: new Date().toISOString() });
    if (!count) return res.status(404).json({ error: 'Agent not found' });
    res.json({ success: true, trashed: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
