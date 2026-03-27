const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb, toBool } = require('../config/database');

const VALID_SORTS = ['title', 'created_at', 'updated_at'];

async function getTagsFor(db, itemId, itemType) {
  return db('tags').select('tags.*')
    .join('item_tags', 'tags.id', 'item_tags.tag_id')
    .where({ 'item_tags.item_id': itemId, 'item_tags.item_type': itemType });
}

function formatNote(n, tags = []) {
  return { ...n, is_favorite: toBool(n.is_favorite), is_pinned: toBool(n.is_pinned), tags };
}

router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const { search, category, favorite, tag, sort = 'updated_at', order = 'desc', limit = 100, offset = 0 } = req.query;

    let q = db('notes').whereNull('deleted_at');
    if (search) q = q.where(b => b
      .where('title', 'like', `%${search}%`)
      .orWhere('content', 'like', `%${search}%`)
      .orWhere('description', 'like', `%${search}%`)
    );
    if (category) q = q.where({ category });
    if (favorite === 'true') q = q.where('is_favorite', 1);

    // Filter by tag via subquery on item_tags
    if (tag) {
      q = q.whereIn('id', function () {
        this.select('item_id').from('item_tags')
          .where({ item_type: 'note', tag_id: tag });
      });
    }

    const sortCol = VALID_SORTS.includes(sort) ? sort : 'updated_at';
    const rows = await q
      .orderBy('is_pinned', 'desc')
      .orderBy(sortCol, order === 'asc' ? 'asc' : 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    const [{ count }] = await db('notes').whereNull('deleted_at').count('id as count');

    const data = await Promise.all(rows.map(async n => formatNote(n, await getTagsFor(db, n.id, 'note'))));
    res.json({ data, total: parseInt(count) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const note = await db('notes').where({ id: req.params.id }).first();
    if (!note) return res.status(404).json({ error: 'Note not found' });
    const tags = await getTagsFor(db, req.params.id, 'note');
    res.json(formatNote(note, tags));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const { title, content, description, category, color, tags = [] } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const id = uuidv4();
    const now = new Date().toISOString();
    await db('notes').insert({
      id, title,
      content: content || '',
      description: description || null,
      category: category || 'general',
      color: color || '#FFD60A',
      is_favorite: 0,
      is_pinned: 0,
      created_at: now,
      updated_at: now,
    });

    for (const tagId of tags) {
      await db('item_tags').insert({ item_id: id, item_type: 'note', tag_id: tagId })
        .onConflict(['item_id', 'item_type', 'tag_id']).ignore();
    }

    const note = await db('notes').where({ id }).first();
    const noteTags = await getTagsFor(db, id, 'note');
    res.status(201).json(formatNote(note, noteTags));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const db = getDb();
    const { title, content, description, category, color, tags } = req.body;
    const existing = await db('notes').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'Note not found' });

    const updates = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (color !== undefined) updates.color = color;

    await db('notes').where({ id: req.params.id }).update(updates);

    if (tags !== undefined) {
      await db('item_tags').where({ item_id: req.params.id, item_type: 'note' }).delete();
      for (const tagId of tags) {
        await db('item_tags').insert({ item_id: req.params.id, item_type: 'note', tag_id: tagId })
          .onConflict(['item_id', 'item_type', 'tag_id']).ignore();
      }
    }

    const note = await db('notes').where({ id: req.params.id }).first();
    const noteTags = await getTagsFor(db, req.params.id, 'note');
    res.json(formatNote(note, noteTags));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id/favorite', async (req, res) => {
  try {
    const db = getDb();
    const note = await db('notes').where({ id: req.params.id }).first();
    if (!note) return res.status(404).json({ error: 'Note not found' });
    const newFav = note.is_favorite ? 0 : 1;
    await db('notes').where({ id: req.params.id }).update({ is_favorite: newFav });
    res.json({ is_favorite: toBool(newFav) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id/pin', async (req, res) => {
  try {
    const db = getDb();
    const note = await db('notes').where({ id: req.params.id }).first();
    if (!note) return res.status(404).json({ error: 'Note not found' });
    const newPin = note.is_pinned ? 0 : 1;
    await db('notes').where({ id: req.params.id }).update({ is_pinned: newPin });
    res.json({ is_pinned: toBool(newPin) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const db = getDb();
    const count = await db('notes').whereNull('deleted_at').where({ id: req.params.id })
      .update({ deleted_at: new Date().toISOString() });
    if (!count) return res.status(404).json({ error: 'Note not found' });
    res.json({ success: true, trashed: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
