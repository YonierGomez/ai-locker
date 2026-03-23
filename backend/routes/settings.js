const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const rows = await db('settings').select('*');
    const result = {};
    rows.forEach(s => { result[s.key] = s.value; });
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/', async (req, res) => {
  try {
    const db = getDb();
    const updates = req.body;
    const now = new Date().toISOString();
    for (const [key, value] of Object.entries(updates)) {
      await db('settings').insert({ key, value: String(value), updated_at: now }).onConflict('key').merge();
    }
    const rows = await db('settings').select('*');
    const result = {};
    rows.forEach(s => { result[s.key] = s.value; });

    // Restart cron job if sync settings changed
    if ('sync_enabled' in updates || 'sync_interval' in updates) {
      const startSyncJob = req.app.locals.startSyncJob;
      if (startSyncJob) {
        if (result.sync_enabled === 'true' && result.s3_bucket) {
          startSyncJob(parseInt(result.sync_interval) || 60);
        } else {
          startSyncJob(0); // stops the job
        }
      }
    }

    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stats', async (req, res) => {
  try {
    const db = getDb();

    // Basic counts (excluding trashed items)
    const [pc] = await db('prompts').whereNull('deleted_at').count('id as count');
    const [sc] = await db('skills').whereNull('deleted_at').count('id as count');
    const [stc] = await db('steering').whereNull('deleted_at').count('id as count');
    const [mc] = await db('mcp_configs').whereNull('deleted_at').count('id as count');
    const [cc] = await db('commands').whereNull('deleted_at').count('id as count');
    const [nc] = await db('notes').whereNull('deleted_at').count('id as count');
    const [tc] = await db('tags').count('id as count');
    const [fpc] = await db('prompts').whereNull('deleted_at').where('is_favorite', 1).count('id as count');
    const [fsc] = await db('skills').whereNull('deleted_at').where('is_favorite', 1).count('id as count');
    const [fstc] = await db('steering').whereNull('deleted_at').where('is_favorite', 1).count('id as count');
    const [fmc] = await db('mcp_configs').whereNull('deleted_at').where('is_favorite', 1).count('id as count');
    const [fcc] = await db('commands').whereNull('deleted_at').where('is_favorite', 1).count('id as count');
    const [fnc] = await db('notes').whereNull('deleted_at').where('is_favorite', 1).count('id as count');

    // Activity last 30 days — computed in JS to avoid SQL dialect differences
    // Use local date helpers to avoid UTC-offset mismatches
    const localDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const d30 = new Date(Date.now() - 29 * 86400000);
    const d365 = new Date(Date.now() - 364 * 86400000);
    const cutoff30 = localDateStr(d30);
    const cutoff365 = localDateStr(d365);

    const [pActivity, sActivity, stActivity, mActivity, cActivity] = await Promise.all([
      db('prompts').whereNull('deleted_at').select('created_at').where('created_at', '>=', cutoff30),
      db('skills').whereNull('deleted_at').select('created_at').where('created_at', '>=', cutoff30),
      db('steering').whereNull('deleted_at').select('created_at').where('created_at', '>=', cutoff30),
      db('mcp_configs').whereNull('deleted_at').select('created_at').where('created_at', '>=', cutoff30),
      db('commands').whereNull('deleted_at').select('created_at').where('created_at', '>=', cutoff30),
    ]);

    const actMap = {};
    const addToMap = (rows, type) => rows.forEach(r => {
      const day = localDateStr(new Date(r.created_at));
      if (!actMap[day]) actMap[day] = { day, prompts: 0, skills: 0, steering: 0, mcp: 0, commands: 0 };
      actMap[day][type]++;
    });
    addToMap(pActivity, 'prompts');
    addToMap(sActivity, 'skills');
    addToMap(stActivity, 'steering');
    addToMap(mActivity, 'mcp');
    addToMap(cActivity, 'commands');
    const activity = Object.values(actMap).sort((a, b) => a.day.localeCompare(b.day));

    // Top used prompts
    const top_used = await db('prompts').whereNull('deleted_at').select('title', 'use_count').where('use_count', '>', 0).orderBy('use_count', 'desc').limit(6);

    // By category
    const byCatRaw = await db('prompts')
      .whereNull('deleted_at')
      .select(db.raw("CASE WHEN category IS NULL OR category = '' THEN 'Uncategorized' ELSE category END as category"))
      .count('id as count')
      .groupByRaw("CASE WHEN category IS NULL OR category = '' THEN 'Uncategorized' ELSE category END")
      .orderBy('count', 'desc')
      .limit(8);
    const by_category = byCatRaw.map(r => ({ category: r.category, count: parseInt(r.count) }));

    // Top tokens — fetch content and compute in JS to avoid CAST dialect differences
    const topTokensRaw = await db('prompts').whereNull('deleted_at').select('title', 'content', 'category').orderByRaw('LENGTH(content) DESC').limit(8);
    const top_tokens = topTokensRaw.map(r => ({
      title: r.title,
      tokens: Math.floor(r.content.length / 4),
      category: r.category || 'general',
    }));

    // Total tokens
    const [pTok, sTok, stTok] = await Promise.all([
      db('prompts').whereNull('deleted_at').select('content'),
      db('skills').whereNull('deleted_at').select('content'),
      db('steering').whereNull('deleted_at').select('content'),
    ]);
    const sumTokens = rows => rows.reduce((s, r) => s + Math.floor(r.content.length / 4), 0);

    // Model distribution (across all content types that have a model field)
    const allModels = await db('prompts').whereNull('deleted_at').select('model');
    const modelMap = {};
    allModels.forEach(r => {
      const m = r.model?.trim() || 'sin modelo';
      modelMap[m] = (modelMap[m] || 0) + 1;
    });
    const model_distribution = Object.entries(modelMap)
      .map(([model, count]) => ({ model, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Favorites by type
    const favorites_by_type = [
      { type: 'Prompts',  count: parseInt(fpc.count),  color: '#007AFF' },
      { type: 'Skills',   count: parseInt(fsc.count),  color: '#FF9500' },
      { type: 'Steering', count: parseInt(fstc.count), color: '#BF5AF2' },
      { type: 'MCP',      count: parseInt(fmc.count),  color: '#30D158' },
      { type: 'Commands', count: parseInt(fcc.count),  color: '#5AC8FA' },
      { type: 'Notes',    count: parseInt(fnc.count),  color: '#FFD60A' },
    ];

    // Activity heatmap — last 365 days (all content types combined)
    const [pH, sH, stH, mH, cH] = await Promise.all([
      db('prompts').whereNull('deleted_at').select('created_at').where('created_at', '>=', cutoff365),
      db('skills').whereNull('deleted_at').select('created_at').where('created_at', '>=', cutoff365),
      db('steering').whereNull('deleted_at').select('created_at').where('created_at', '>=', cutoff365),
      db('mcp_configs').whereNull('deleted_at').select('created_at').where('created_at', '>=', cutoff365),
      db('commands').whereNull('deleted_at').select('created_at').where('created_at', '>=', cutoff365),
    ]);
    const heatMap = {};
    [...pH, ...sH, ...stH, ...mH, ...cH].forEach(r => {
      const day = localDateStr(new Date(r.created_at));
      heatMap[day] = (heatMap[day] || 0) + 1;
    });
    const activity_heatmap = heatMap;

    res.json({
      prompts: parseInt(pc.count),
      skills: parseInt(sc.count),
      steering: parseInt(stc.count),
      mcp_configs: parseInt(mc.count),
      commands: parseInt(cc.count),
      notes: parseInt(nc.count),
      tags: parseInt(tc.count),
      favorites: {
        prompts: parseInt(fpc.count),
        skills: parseInt(fsc.count),
        steering: parseInt(fstc.count),
        mcp_configs: parseInt(fmc.count),
        commands: parseInt(fcc.count),
        notes: parseInt(fnc.count),
      },
      activity,
      top_used,
      by_category,
      top_tokens,
      total_tokens: {
        prompts: sumTokens(pTok),
        skills: sumTokens(sTok),
        steering: sumTokens(stTok),
      },
      model_distribution,
      favorites_by_type,
      activity_heatmap,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
