const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb, toBool } = require('../config/database');

const VALID_SORTS = ['title', 'created_at', 'updated_at', 'use_count'];
const LANGUAGES = ['javascript', 'typescript', 'python', 'bash', 'sql', 'html', 'css', 'json', 'yaml', 'markdown', 'rust', 'go', 'java', 'cpp', 'php', 'ruby', 'swift', 'kotlin', 'other'];

function formatSnippet(s) {
  return { ...s, is_favorite: toBool(s.is_favorite) };
}

// GET /snippets
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const { search, category, language, favorite, sort = 'updated_at', order = 'desc', limit = 100, offset = 0 } = req.query;

    let q = db('snippets').whereNull('deleted_at');
    if (search) q = q.where(b => b
      .where('title', 'like', `%${search}%`)
      .orWhere('code', 'like', `%${search}%`)
      .orWhere('description', 'like', `%${search}%`)
    );
    if (category) q = q.where({ category });
    if (language) q = q.where({ language });
    if (favorite === 'true') q = q.where('is_favorite', 1);

    const sortCol = VALID_SORTS.includes(sort) ? sort : 'updated_at';
    const rows = await q.orderBy(sortCol, order === 'asc' ? 'asc' : 'desc').limit(parseInt(limit)).offset(parseInt(offset));
    const [{ count }] = await db('snippets').whereNull('deleted_at').count('id as count');

    res.json({ data: rows.map(formatSnippet), total: parseInt(count) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /snippets/:id
router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const snippet = await db('snippets').where({ id: req.params.id }).first();
    if (!snippet) return res.status(404).json({ error: 'Snippet not found' });
    res.json(formatSnippet(snippet));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /snippets
router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const { title, code, description, language, category } = req.body;
    if (!title || !code) return res.status(400).json({ error: 'Title and code are required' });

    const id = uuidv4();
    const now = new Date().toISOString();
    await db('snippets').insert({
      id, title, code, description: description || null,
      language: language || 'javascript',
      category: category || 'general',
      is_favorite: 0, use_count: 0, created_at: now, updated_at: now,
    });
    const snippet = await db('snippets').where({ id }).first();
    res.status(201).json(formatSnippet(snippet));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /snippets/:id
router.put('/:id', async (req, res) => {
  try {
    const db = getDb();
    const { title, code, description, language, category } = req.body;
    const existing = await db('snippets').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'Snippet not found' });

    const updates = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (code !== undefined) updates.code = code;
    if (description !== undefined) updates.description = description;
    if (language !== undefined) updates.language = language;
    if (category !== undefined) updates.category = category;
    await db('snippets').where({ id: req.params.id }).update(updates);

    const snippet = await db('snippets').where({ id: req.params.id }).first();
    res.json(formatSnippet(snippet));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /snippets/:id/favorite
router.patch('/:id/favorite', async (req, res) => {
  try {
    const db = getDb();
    const snippet = await db('snippets').where({ id: req.params.id }).first();
    if (!snippet) return res.status(404).json({ error: 'Snippet not found' });
    const newFav = snippet.is_favorite ? 0 : 1;
    await db('snippets').where({ id: req.params.id }).update({ is_favorite: newFav });
    res.json({ is_favorite: toBool(newFav) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /snippets/:id/use
router.patch('/:id/use', async (req, res) => {
  try {
    const db = getDb();
    await db('snippets').where({ id: req.params.id }).increment('use_count', 1);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /snippets/:id (soft delete → trash)
router.delete('/:id', async (req, res) => {
  try {
    const db = getDb();
    const count = await db('snippets').whereNull('deleted_at').where({ id: req.params.id }).update({ deleted_at: new Date().toISOString() });
    if (!count) return res.status(404).json({ error: 'Snippet not found' });
    res.json({ success: true, trashed: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
