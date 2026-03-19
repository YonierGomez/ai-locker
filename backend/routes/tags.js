const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb, isUniqueError } = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const tags = await db('tags').orderBy('name', 'asc');
    res.json({ data: tags });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const id = uuidv4();
    const now = new Date().toISOString();
    await db('tags').insert({ id, name: name.trim(), color: color || '#6366f1', created_at: now });
    const tag = await db('tags').where({ id }).first();
    res.status(201).json(tag);
  } catch (err) {
    if (isUniqueError(err)) return res.status(409).json({ error: 'Tag already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const db = getDb();
    const { name, color } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (color !== undefined) updates.color = color;
    await db('tags').where({ id: req.params.id }).update(updates);
    const tag = await db('tags').where({ id: req.params.id }).first();
    if (!tag) return res.status(404).json({ error: 'Tag not found' });
    res.json(tag);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const db = getDb();
    await db('item_tags').where({ tag_id: req.params.id }).delete();
    const count = await db('tags').where({ id: req.params.id }).delete();
    if (!count) return res.status(404).json({ error: 'Tag not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
