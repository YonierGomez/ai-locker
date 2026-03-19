const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb, toBool } = require('../config/database');

const VALID_SORTS = ['title', 'created_at', 'updated_at', 'priority'];

async function getTagsFor(db, itemId, itemType) {
  return db('tags').select('tags.*').join('item_tags', 'tags.id', 'item_tags.tag_id').where({ 'item_tags.item_id': itemId, 'item_tags.item_type': itemType });
}

function formatItem(s, tags = []) {
  return { ...s, is_favorite: toBool(s.is_favorite), is_active: toBool(s.is_active), tags };
}

router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const { search, category, scope, favorite, active, sort = 'priority', order = 'desc', limit = 50, offset = 0 } = req.query;

    let q = db('steering').whereNull('deleted_at');
    if (search) q = q.where(b => b.where('title', 'like', `%${search}%`).orWhere('content', 'like', `%${search}%`).orWhere('description', 'like', `%${search}%`));
    if (category) q = q.where({ category });
    if (scope) q = q.where({ scope });
    if (favorite === 'true') q = q.where('is_favorite', 1);
    if (active === 'true') q = q.where('is_active', 1);

    const sortCol = VALID_SORTS.includes(sort) ? sort : 'priority';
    const rows = await q.orderBy(sortCol, order === 'asc' ? 'asc' : 'desc').limit(parseInt(limit)).offset(parseInt(offset));
    const [{ count }] = await db('steering').count('id as count');

    const data = await Promise.all(rows.map(async s => formatItem(s, await getTagsFor(db, s.id, 'steering'))));
    res.json({ data, total: parseInt(count) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const item = await db('steering').where({ id: req.params.id }).first();
    if (!item) return res.status(404).json({ error: 'Steering not found' });
    const tags = await getTagsFor(db, req.params.id, 'steering');
    res.json(formatItem(item, tags));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const { title, content, description, category, scope, priority, tags = [] } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });

    const id = uuidv4();
    const now = new Date().toISOString();
    await db('steering').insert({ id, title, content, description: description || null, category: category || 'general', scope: scope || 'global', priority: priority || 0, is_active: 1, is_favorite: 0, created_at: now, updated_at: now });

    for (const tagId of tags) {
      await db('item_tags').insert({ item_id: id, item_type: 'steering', tag_id: tagId }).onConflict(['item_id', 'item_type', 'tag_id']).ignore();
    }

    const item = await db('steering').where({ id }).first();
    res.status(201).json(formatItem(item, []));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const db = getDb();
    const { title, content, description, category, scope, priority, is_active, tags } = req.body;
    const existing = await db('steering').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'Steering not found' });

    const updates = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (scope !== undefined) updates.scope = scope;
    if (priority !== undefined) updates.priority = priority;
    if (is_active !== undefined) updates.is_active = is_active ? 1 : 0;
    await db('steering').where({ id: req.params.id }).update(updates);

    if (tags !== undefined) {
      await db('item_tags').where({ item_id: req.params.id, item_type: 'steering' }).delete();
      for (const tagId of tags) {
        await db('item_tags').insert({ item_id: req.params.id, item_type: 'steering', tag_id: tagId }).onConflict(['item_id', 'item_type', 'tag_id']).ignore();
      }
    }

    const item = await db('steering').where({ id: req.params.id }).first();
    const itemTags = await getTagsFor(db, req.params.id, 'steering');
    res.json(formatItem(item, itemTags));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id/favorite', async (req, res) => {
  try {
    const db = getDb();
    const item = await db('steering').where({ id: req.params.id }).first();
    if (!item) return res.status(404).json({ error: 'Steering not found' });
    const newFav = item.is_favorite ? 0 : 1;
    await db('steering').where({ id: req.params.id }).update({ is_favorite: newFav });
    res.json({ is_favorite: toBool(newFav) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id/toggle', async (req, res) => {
  try {
    const db = getDb();
    const item = await db('steering').where({ id: req.params.id }).first();
    if (!item) return res.status(404).json({ error: 'Steering not found' });
    const newActive = item.is_active ? 0 : 1;
    await db('steering').where({ id: req.params.id }).update({ is_active: newActive, updated_at: new Date().toISOString() });
    res.json({ is_active: toBool(newActive) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const db = getDb();
    const count = await db('steering').whereNull('deleted_at').where({ id: req.params.id }).update({ deleted_at: new Date().toISOString() });
    if (!count) return res.status(404).json({ error: 'Steering not found' });
    res.json({ success: true, trashed: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
