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

    if ('sync_enabled' in updates || 'sync_interval' in updates) {
      const startSyncJob = req.app.locals.startSyncJob;
      if (startSyncJob) {
        if (result.sync_enabled === 'true' && result.s3_bucket) {
          startSyncJob(parseInt(result.sync_interval) || 60);
        } else {
          startSyncJob(0);
        }
      }
    }

    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stats', async (req, res) => {
  try {
    const db = getDb();

    // ── Basic counts ─────────────────────────────────────────
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

    const localDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const d30 = new Date(Date.now() - 29 * 86400000);
    const d365 = new Date(Date.now() - 364 * 86400000);
    const cutoff30 = localDateStr(d30);
    const cutoff365 = localDateStr(d365);

    // ── Activity last 30 days ─────────────────────────────────
    const [pActivity, sActivity, stActivity, mActivity, cActivity, nActivity] = await Promise.all([
      db('prompts').whereNull('deleted_at').select('created_at').where('created_at', '>=', cutoff30),
      db('skills').whereNull('deleted_at').select('created_at').where('created_at', '>=', cutoff30),
      db('steering').whereNull('deleted_at').select('created_at').where('created_at', '>=', cutoff30),
      db('mcp_configs').whereNull('deleted_at').select('created_at').where('created_at', '>=', cutoff30),
      db('commands').whereNull('deleted_at').select('created_at').where('created_at', '>=', cutoff30),
      db('notes').whereNull('deleted_at').select('created_at').where('created_at', '>=', cutoff30),
    ]);

    const actMap = {};
    const addToMap = (rows, type) => rows.forEach(r => {
      const day = localDateStr(new Date(r.created_at));
      if (!actMap[day]) actMap[day] = { day, prompts: 0, skills: 0, steering: 0, mcp: 0, commands: 0, notes: 0 };
      actMap[day][type]++;
    });
    addToMap(pActivity, 'prompts');
    addToMap(sActivity, 'skills');
    addToMap(stActivity, 'steering');
    addToMap(mActivity, 'mcp');
    addToMap(cActivity, 'commands');
    addToMap(nActivity, 'notes');
    const activity = Object.values(actMap).sort((a, b) => a.day.localeCompare(b.day));

    // ── Top used prompts ──────────────────────────────────────
    const top_used = await db('prompts').whereNull('deleted_at').select('title', 'use_count').where('use_count', '>', 0).orderBy('use_count', 'desc').limit(6);

    // ── By category ───────────────────────────────────────────
    const byCatRaw = await db('prompts')
      .whereNull('deleted_at')
      .select(db.raw("CASE WHEN category IS NULL OR category = '' THEN 'Uncategorized' ELSE category END as category"))
      .count('id as count')
      .groupByRaw("CASE WHEN category IS NULL OR category = '' THEN 'Uncategorized' ELSE category END")
      .orderBy('count', 'desc')
      .limit(8);
    const by_category = byCatRaw.map(r => ({ category: r.category, count: parseInt(r.count) }));

    // ── Top tokens ────────────────────────────────────────────
    const topTokensRaw = await db('prompts').whereNull('deleted_at').select('title', 'content', 'category').orderByRaw('LENGTH(content) DESC').limit(8);
    const top_tokens = topTokensRaw.map(r => ({
      title: r.title,
      tokens: Math.floor(r.content.length / 4),
      category: r.category || 'general',
    }));

    // ── Total tokens ──────────────────────────────────────────
    const [pTok, sTok, stTok] = await Promise.all([
      db('prompts').whereNull('deleted_at').select('content'),
      db('skills').whereNull('deleted_at').select('content'),
      db('steering').whereNull('deleted_at').select('content'),
    ]);
    const sumTokens = rows => rows.reduce((s, r) => s + Math.floor(r.content.length / 4), 0);

    // ── Model distribution ────────────────────────────────────
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

    // ── Favorites by type ─────────────────────────────────────
    const favorites_by_type = [
      { type: 'Prompts',  count: parseInt(fpc.count),  color: '#007AFF' },
      { type: 'Skills',   count: parseInt(fsc.count),  color: '#FF9500' },
      { type: 'Steering', count: parseInt(fstc.count), color: '#BF5AF2' },
      { type: 'MCP',      count: parseInt(fmc.count),  color: '#30D158' },
      { type: 'Commands', count: parseInt(fcc.count),  color: '#5AC8FA' },
      { type: 'Notes',    count: parseInt(fnc.count),  color: '#FFD60A' },
    ];

    // ── Activity heatmap (365 days) ───────────────────────────
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

    // ── Dashboard 1: Library Health ───────────────────────────
    const [promptsAll, skillsAll, steeringAll, commandsAll, notesAll, mcpAll] = await Promise.all([
      db('prompts').whereNull('deleted_at').select('description', 'category', 'use_count'),
      db('skills').whereNull('deleted_at').select('description', 'category', 'is_active'),
      db('steering').whereNull('deleted_at').select('description', 'category', 'scope', 'is_active'),
      db('commands').whereNull('deleted_at').select('description', 'category', 'use_count'),
      db('notes').whereNull('deleted_at').select('description', 'category', 'content'),
      db('mcp_configs').whereNull('deleted_at').select('description', 'is_active'),
    ]);

    const totalItems = promptsAll.length + skillsAll.length + steeringAll.length + commandsAll.length + notesAll.length + mcpAll.length;
    const itemsWithDesc = [
      ...promptsAll.filter(p => p.description?.trim()),
      ...skillsAll.filter(s => s.description?.trim()),
      ...steeringAll.filter(s => s.description?.trim()),
      ...commandsAll.filter(c => c.description?.trim()),
    ].length;

    const health = {
      prompts_no_description: promptsAll.filter(p => !p.description?.trim()).length,
      prompts_no_category: promptsAll.filter(p => !p.category || p.category === 'general').length,
      prompts_never_used: promptsAll.filter(p => !p.use_count || p.use_count === 0).length,
      skills_inactive: skillsAll.filter(s => !s.is_active).length,
      skills_no_description: skillsAll.filter(s => !s.description?.trim()).length,
      steering_inactive: steeringAll.filter(s => !s.is_active).length,
      notes_no_content: notesAll.filter(n => !n.content?.trim()).length,
      commands_never_used: commandsAll.filter(c => !c.use_count || c.use_count === 0).length,
      mcp_inactive: mcpAll.filter(m => !m.is_active).length,
      total_items: totalItems,
      items_with_description: itemsWithDesc,
    };

    // ── Dashboard 2: Top Performers ───────────────────────────
    const top_commands_used = await db('commands').whereNull('deleted_at')
      .select('title', 'use_count', 'shell').where('use_count', '>', 0)
      .orderBy('use_count', 'desc').limit(5);

    const top_skills_recent = await db('skills').whereNull('deleted_at')
      .select('title', 'updated_at', 'is_active').orderBy('updated_at', 'desc').limit(5);

    const mcp_active_list = await db('mcp_configs').whereNull('deleted_at')
      .where('is_active', 1).select('title', 'server_name', 'transport').limit(8);

    // ── Dashboard 3: Weekly Summary ───────────────────────────
    const d7 = new Date(Date.now() - 6 * 86400000);
    const d14 = new Date(Date.now() - 13 * 86400000);
    const cutoff7 = localDateStr(d7);
    const cutoff14 = localDateStr(d14);

    const weeklyTables = ['prompts', 'skills', 'steering', 'mcp_configs', 'commands', 'notes'];
    const typeLabels = { prompts: 'Prompts', skills: 'Skills', steering: 'Steering', mcp_configs: 'MCP', commands: 'Commands', notes: 'Notes' };
    const typeColors = { prompts: '#007AFF', skills: '#FF9500', steering: '#BF5AF2', mcp_configs: '#30D158', commands: '#5AC8FA', notes: '#FFD60A' };

    const weeklyRaw = await Promise.all(
      weeklyTables.map(t => db(t).whereNull('deleted_at').select('created_at').where('created_at', '>=', cutoff14))
    );

    const weekly_this = {};
    const weekly_prev = {};
    weeklyTables.forEach((t, i) => {
      weekly_this[t] = weeklyRaw[i].filter(r => localDateStr(new Date(r.created_at)) >= cutoff7).length;
      weekly_prev[t] = weeklyRaw[i].filter(r => {
        const d = localDateStr(new Date(r.created_at));
        return d >= cutoff14 && d < cutoff7;
      }).length;
    });

    const thisWeekTotal = Object.values(weekly_this).reduce((s, v) => s + v, 0);
    const prevWeekTotal = Object.values(weekly_prev).reduce((s, v) => s + v, 0);

    // Streak: consecutive days with activity
    const allDaysActivity = new Set(Object.keys(actMap));
    let streak = 0;
    const todayDate = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(todayDate);
      d.setDate(d.getDate() - i);
      if (allDaysActivity.has(localDateStr(d))) streak++;
      else break;
    }

    const weekly_by_type = weeklyTables.map(t => ({
      type: typeLabels[t],
      this_week: weekly_this[t],
      prev_week: weekly_prev[t],
      color: typeColors[t],
    })).filter(r => r.this_week > 0 || r.prev_week > 0);

    const weekly_summary = {
      this_week: thisWeekTotal,
      prev_week: prevWeekTotal,
      change_pct: prevWeekTotal > 0 ? Math.round(((thisWeekTotal - prevWeekTotal) / prevWeekTotal) * 100) : null,
      streak_days: streak,
      by_type: weekly_by_type,
    };

    // ── Dashboard 4: Category Distribution (cross-type) ───────
    const catTables = [
      { table: 'prompts', label: 'prompts', color: '#007AFF' },
      { table: 'skills', label: 'skills', color: '#FF9500' },
      { table: 'steering', label: 'steering', color: '#BF5AF2' },
      { table: 'notes', label: 'notes', color: '#FFD60A' },
    ];
    const catRaw = await Promise.all(
      catTables.map(({ table }) =>
        db(table).whereNull('deleted_at')
          .select(db.raw("CASE WHEN category IS NULL OR category = '' THEN 'general' ELSE category END as category"))
          .count('id as count')
          .groupByRaw("CASE WHEN category IS NULL OR category = '' THEN 'general' ELSE category END")
      )
    );

    const allCats = new Set();
    catRaw.forEach(rows => rows.forEach(r => allCats.add(r.category)));
    const category_distribution = [...allCats].map(cat => {
      const row = { category: cat };
      catTables.forEach(({ label }, i) => {
        const found = catRaw[i].find(r => r.category === cat);
        row[label] = found ? parseInt(found.count) : 0;
      });
      row.total = catTables.reduce((s, { label }) => s + (row[label] || 0), 0);
      return row;
    }).sort((a, b) => b.total - a.total).slice(0, 10);

    // ── Dashboard 5: Notes Insights ───────────────────────────
    const notesDetailed = await db('notes').whereNull('deleted_at')
      .select('title', 'content', 'color', 'category', 'is_pinned', 'is_favorite');

    const colorCountMap = {};
    notesDetailed.forEach(n => {
      const c = n.color || '#FFD60A';
      colorCountMap[c] = (colorCountMap[c] || 0) + 1;
    });
    const notes_by_color = Object.entries(colorCountMap)
      .map(([color, count]) => ({ color, count }))
      .sort((a, b) => b.count - a.count);

    const notesCatCountMap = {};
    notesDetailed.forEach(n => {
      const c = n.category || 'general';
      notesCatCountMap[c] = (notesCatCountMap[c] || 0) + 1;
    });
    const notes_by_category_insights = Object.entries(notesCatCountMap)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    const notes_top_longest = notesDetailed
      .filter(n => n.content?.length > 0)
      .sort((a, b) => (b.content?.length || 0) - (a.content?.length || 0))
      .slice(0, 5)
      .map(n => ({ title: n.title, chars: n.content?.length || 0 }));

    const notes_insights = {
      total: notesDetailed.length,
      pinned: notesDetailed.filter(n => n.is_pinned).length,
      favorites: notesDetailed.filter(n => n.is_favorite).length,
      with_content: notesDetailed.filter(n => n.content?.trim()).length,
      avg_length: notesDetailed.length
        ? Math.round(notesDetailed.reduce((s, n) => s + (n.content?.length || 0), 0) / notesDetailed.length)
        : 0,
      by_color: notes_by_color,
      by_category: notes_by_category_insights,
      top_longest: notes_top_longest,
    };

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
      // New dashboards
      health,
      top_commands_used,
      top_skills_recent,
      mcp_active_list,
      weekly_summary,
      category_distribution,
      notes_insights,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
