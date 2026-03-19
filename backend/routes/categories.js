const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb, isUniqueError } = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const { item_type } = req.query;
    let q = db('categories').orderBy('name', 'asc');
    if (item_type) q = q.where(b => b.where({ item_type }).orWhere({ item_type: 'all' }));
    const cats = await q;
    res.json({ data: cats });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const { name, color, icon, item_type } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const id = uuidv4();
    const now = new Date().toISOString();
    await db('categories').insert({ id, name: name.trim().toLowerCase(), color: color || '#6366f1', icon: icon || 'tag', item_type: item_type || 'all', created_at: now });
    const cat = await db('categories').where({ id }).first();
    res.status(201).json(cat);
  } catch (err) {
    if (isUniqueError(err)) return res.status(409).json({ error: 'Category already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const db = getDb();
    const { name, color, icon, item_type } = req.body;
    const cat = await db('categories').where({ id: req.params.id }).first();
    if (!cat) return res.status(404).json({ error: 'Category not found' });

    const updates = {};
    if (name !== undefined) updates.name = name.toLowerCase();
    if (color !== undefined) updates.color = color;
    if (icon !== undefined) updates.icon = icon;
    if (item_type !== undefined) updates.item_type = item_type;
    await db('categories').where({ id: req.params.id }).update(updates);
    const updated = await db('categories').where({ id: req.params.id }).first();
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const db = getDb();
    const cat = await db('categories').where({ id: req.params.id }).first();
    if (!cat) return res.status(404).json({ error: 'Category not found' });
    if (cat.id.startsWith('cat-')) return res.status(403).json({ error: 'Cannot delete default categories' });

    await db('categories').where({ id: req.params.id }).delete();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
