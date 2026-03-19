const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb, toBool } = require('../config/database');

const VALID_SORTS = ['title', 'created_at', 'updated_at', 'use_count'];

async function getTagsFor(db, itemId, itemType) {
  return db('tags').select('tags.*')
    .join('item_tags', 'tags.id', 'item_tags.tag_id')
    .where({ 'item_tags.item_id': itemId, 'item_tags.item_type': itemType });
}

function formatPrompt(p, tags = []) {
  return { ...p, is_favorite: toBool(p.is_favorite), tags };
}

router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const { search, category, favorite, sort = 'updated_at', order = 'desc', limit = 50, offset = 0 } = req.query;

    let q = db('prompts').whereNull('deleted_at');
    if (search) q = q.where(b => b.where('title', 'like', `%${search}%`).orWhere('content', 'like', `%${search}%`).orWhere('description', 'like', `%${search}%`));
    if (category) q = q.where({ category });
    if (favorite === 'true') q = q.where('is_favorite', 1);

    const sortCol = VALID_SORTS.includes(sort) ? sort : 'updated_at';
    const rows = await q.orderBy(sortCol, order === 'asc' ? 'asc' : 'desc').limit(parseInt(limit)).offset(parseInt(offset));
    const [{ count }] = await db('prompts').count('id as count');

    const data = await Promise.all(rows.map(async p => formatPrompt(p, await getTagsFor(db, p.id, 'prompt'))));
    res.json({ data, total: parseInt(count), limit: parseInt(limit), offset: parseInt(offset) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const prompt = await db('prompts').where({ id: req.params.id }).first();
    if (!prompt) return res.status(404).json({ error: 'Prompt not found' });
    const tags = await getTagsFor(db, req.params.id, 'prompt');
    res.json(formatPrompt(prompt, tags));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const { title, content, description, category, model, temperature, max_tokens, tags = [] } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });

    const id = uuidv4();
    const now = new Date().toISOString();
    await db('prompts').insert({ id, title, content, description: description || null, category: category || 'general', model: model || null, temperature: temperature ?? 0.7, max_tokens: max_tokens || null, is_favorite: 0, use_count: 0, created_at: now, updated_at: now });

    for (const tagId of tags) {
      await db('item_tags').insert({ item_id: id, item_type: 'prompt', tag_id: tagId }).onConflict(['item_id', 'item_type', 'tag_id']).ignore();
    }

    const prompt = await db('prompts').where({ id }).first();
    res.status(201).json(formatPrompt(prompt, []));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const db = getDb();
    const { title, content, description, category, model, temperature, max_tokens, tags } = req.body;
    const existing = await db('prompts').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'Prompt not found' });

    const updates = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (model !== undefined) updates.model = model;
    if (temperature !== undefined) updates.temperature = temperature;
    if (max_tokens !== undefined) updates.max_tokens = max_tokens;
    await db('prompts').where({ id: req.params.id }).update(updates);

    if (tags !== undefined) {
      await db('item_tags').where({ item_id: req.params.id, item_type: 'prompt' }).delete();
      for (const tagId of tags) {
        await db('item_tags').insert({ item_id: req.params.id, item_type: 'prompt', tag_id: tagId }).onConflict(['item_id', 'item_type', 'tag_id']).ignore();
      }
    }

    const prompt = await db('prompts').where({ id: req.params.id }).first();
    const promptTags = await getTagsFor(db, req.params.id, 'prompt');
    res.json(formatPrompt(prompt, promptTags));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id/favorite', async (req, res) => {
  try {
    const db = getDb();
    const prompt = await db('prompts').where({ id: req.params.id }).first();
    if (!prompt) return res.status(404).json({ error: 'Prompt not found' });
    const newFav = prompt.is_favorite ? 0 : 1;
    await db('prompts').where({ id: req.params.id }).update({ is_favorite: newFav });
    res.json({ is_favorite: toBool(newFav) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id/use', async (req, res) => {
  try {
    const db = getDb();
    await db('prompts').where({ id: req.params.id }).increment('use_count', 1);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const db = getDb();
    const count = await db('prompts').whereNull('deleted_at').where({ id: req.params.id }).update({ deleted_at: new Date().toISOString() });
    if (!count) return res.status(404).json({ error: 'Prompt not found' });
    res.json({ success: true, trashed: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
