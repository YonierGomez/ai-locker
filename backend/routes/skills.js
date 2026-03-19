const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb, toBool } = require('../config/database');

const VALID_SORTS = ['title', 'created_at', 'updated_at', 'use_count'];

async function getTagsFor(db, itemId, itemType) {
  return db('tags').select('tags.*').join('item_tags', 'tags.id', 'item_tags.tag_id').where({ 'item_tags.item_id': itemId, 'item_tags.item_type': itemType });
}

function formatSkill(s, tags = []) {
  return { ...s, is_favorite: toBool(s.is_favorite), is_active: toBool(s.is_active), tags };
}

router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const { search, category, favorite, active, sort = 'updated_at', order = 'desc', limit = 50, offset = 0 } = req.query;

    let q = db('skills').whereNull('deleted_at');
    if (search) q = q.where(b => b.where('title', 'like', `%${search}%`).orWhere('content', 'like', `%${search}%`).orWhere('description', 'like', `%${search}%`).orWhere('trigger_phrase', 'like', `%${search}%`));
    if (category) q = q.where({ category });
    if (favorite === 'true') q = q.where('is_favorite', 1);
    if (active === 'true') q = q.where('is_active', 1);

    const sortCol = VALID_SORTS.includes(sort) ? sort : 'updated_at';
    const rows = await q.orderBy(sortCol, order === 'asc' ? 'asc' : 'desc').limit(parseInt(limit)).offset(parseInt(offset));
    const [{ count }] = await db('skills').count('id as count');

    const data = await Promise.all(rows.map(async s => formatSkill(s, await getTagsFor(db, s.id, 'skill'))));
    res.json({ data, total: parseInt(count) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const skill = await db('skills').where({ id: req.params.id }).first();
    if (!skill) return res.status(404).json({ error: 'Skill not found' });
    const tags = await getTagsFor(db, req.params.id, 'skill');
    res.json(formatSkill(skill, tags));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const { title, content, description, category, trigger_phrase, tags = [] } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });

    const id = uuidv4();
    const now = new Date().toISOString();
    await db('skills').insert({ id, title, content, description: description || null, category: category || 'general', trigger_phrase: trigger_phrase || null, is_active: 1, is_favorite: 0, use_count: 0, created_at: now, updated_at: now });

    for (const tagId of tags) {
      await db('item_tags').insert({ item_id: id, item_type: 'skill', tag_id: tagId }).onConflict(['item_id', 'item_type', 'tag_id']).ignore();
    }

    const skill = await db('skills').where({ id }).first();
    res.status(201).json(formatSkill(skill, []));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const db = getDb();
    const { title, content, description, category, trigger_phrase, is_active, tags } = req.body;
    const existing = await db('skills').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'Skill not found' });

    const updates = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (trigger_phrase !== undefined) updates.trigger_phrase = trigger_phrase;
    if (is_active !== undefined) updates.is_active = is_active ? 1 : 0;
    await db('skills').where({ id: req.params.id }).update(updates);

    if (tags !== undefined) {
      await db('item_tags').where({ item_id: req.params.id, item_type: 'skill' }).delete();
      for (const tagId of tags) {
        await db('item_tags').insert({ item_id: req.params.id, item_type: 'skill', tag_id: tagId }).onConflict(['item_id', 'item_type', 'tag_id']).ignore();
      }
    }

    const skill = await db('skills').where({ id: req.params.id }).first();
    const skillTags = await getTagsFor(db, req.params.id, 'skill');
    res.json(formatSkill(skill, skillTags));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id/favorite', async (req, res) => {
  try {
    const db = getDb();
    const skill = await db('skills').where({ id: req.params.id }).first();
    if (!skill) return res.status(404).json({ error: 'Skill not found' });
    const newFav = skill.is_favorite ? 0 : 1;
    await db('skills').where({ id: req.params.id }).update({ is_favorite: newFav });
    res.json({ is_favorite: toBool(newFav) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id/toggle', async (req, res) => {
  try {
    const db = getDb();
    const skill = await db('skills').where({ id: req.params.id }).first();
    if (!skill) return res.status(404).json({ error: 'Skill not found' });
    const newActive = skill.is_active ? 0 : 1;
    await db('skills').where({ id: req.params.id }).update({ is_active: newActive, updated_at: new Date().toISOString() });
    res.json({ is_active: toBool(newActive) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const db = getDb();
    const count = await db('skills').whereNull('deleted_at').where({ id: req.params.id }).update({ deleted_at: new Date().toISOString() });
    if (!count) return res.status(404).json({ error: 'Skill not found' });
    res.json({ success: true, trashed: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
