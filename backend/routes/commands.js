const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb, toBool } = require('../config/database');

const VALID_SORTS = ['title', 'created_at', 'updated_at', 'use_count'];

function formatCmd(c) {
  return { ...c, is_favorite: toBool(c.is_favorite) };
}

router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const { search, category, shell, platform, favorite, sort = 'updated_at', order = 'desc', limit = 100, offset = 0 } = req.query;

    let q = db('commands').whereNull('deleted_at');
    if (search) q = q.where(b => b
      .where('title', 'like', `%${search}%`)
      .orWhere('command', 'like', `%${search}%`)
      .orWhere('description', 'like', `%${search}%`)
    );
    if (category) q = q.where({ category });
    if (shell) q = q.where({ shell });
    if (platform) q = q.where({ platform });
    if (favorite === 'true') q = q.where('is_favorite', 1);

    const sortCol = VALID_SORTS.includes(sort) ? sort : 'updated_at';
    const rows = await q.orderBy(sortCol, order === 'asc' ? 'asc' : 'desc').limit(parseInt(limit)).offset(parseInt(offset));
    const [{ count }] = await db('commands').whereNull('deleted_at').count('id as count');

    res.json({ data: rows.map(formatCmd), total: parseInt(count) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const cmd = await db('commands').where({ id: req.params.id }).first();
    if (!cmd) return res.status(404).json({ error: 'Command not found' });
    res.json(formatCmd(cmd));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const { title, command, description, shell, platform, category } = req.body;
    if (!title || !command) return res.status(400).json({ error: 'Title and command are required' });

    const id = uuidv4();
    const now = new Date().toISOString();
    await db('commands').insert({
      id, title, command, description: description || null,
      shell: shell || 'bash', platform: platform || 'all', category: category || 'general',
      is_favorite: 0, use_count: 0, created_at: now, updated_at: now,
    });
    const cmd = await db('commands').where({ id }).first();
    res.status(201).json(formatCmd(cmd));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const db = getDb();
    const { title, command, description, shell, platform, category } = req.body;
    const existing = await db('commands').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'Command not found' });

    const updates = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (command !== undefined) updates.command = command;
    if (description !== undefined) updates.description = description;
    if (shell !== undefined) updates.shell = shell;
    if (platform !== undefined) updates.platform = platform;
    if (category !== undefined) updates.category = category;
    await db('commands').where({ id: req.params.id }).update(updates);

    const cmd = await db('commands').where({ id: req.params.id }).first();
    res.json(formatCmd(cmd));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id/favorite', async (req, res) => {
  try {
    const db = getDb();
    const cmd = await db('commands').where({ id: req.params.id }).first();
    if (!cmd) return res.status(404).json({ error: 'Command not found' });
    const newFav = cmd.is_favorite ? 0 : 1;
    await db('commands').where({ id: req.params.id }).update({ is_favorite: newFav });
    res.json({ is_favorite: toBool(newFav) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id/use', async (req, res) => {
  try {
    const db = getDb();
    await db('commands').where({ id: req.params.id }).increment('use_count', 1);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const db = getDb();
    const count = await db('commands').whereNull('deleted_at').where({ id: req.params.id }).update({ deleted_at: new Date().toISOString() });
    if (!count) return res.status(404).json({ error: 'Command not found' });
    res.json({ success: true, trashed: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
