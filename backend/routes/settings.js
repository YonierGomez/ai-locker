const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');

// Environment variable overrides — if set, they ALWAYS take priority over DB values.
// This allows deploying with a .env file and having the UI reflect those values.
const ENV_OVERRIDES = {
  ai_provider:             () => process.env.AI_PROVIDER,
  ai_api_key:              () => process.env.AI_API_KEY || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GOOGLE_AI_API_KEY,
  ai_base_url:             () => process.env.AI_BASE_URL,
  ai_model:                () => process.env.AI_MODEL,
  ai_aws_region:           () => process.env.AI_AWS_REGION,
  ai_aws_access_key_id:    () => process.env.AI_AWS_ACCESS_KEY_ID,
  ai_aws_secret_access_key:() => process.env.AI_AWS_SECRET_ACCESS_KEY,
  s3_bucket:               () => process.env.S3_BUCKET,
  s3_region:               () => process.env.S3_REGION,
  s3_prefix:               () => process.env.S3_PREFIX,
  s3_access_key:           () => process.env.S3_ACCESS_KEY,
  s3_secret_key:           () => process.env.S3_SECRET_KEY,
  s3_endpoint:             () => process.env.S3_ENDPOINT,
  sync_enabled:            () => process.env.SYNC_ENABLED,
  sync_interval:           () => process.env.SYNC_INTERVAL,
  default_model:           () => process.env.DEFAULT_MODEL || process.env.AI_MODEL,
}

// Keys that should be masked when the request is unauthenticated
const SENSITIVE_KEYS = new Set([
  'ai_api_key', 'ai_aws_secret_access_key',
  's3_access_key', 's3_secret_key',
])

router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const rows = await db('settings').select('*');
    const result = {};
    rows.forEach(s => { result[s.key] = s.value; });
    // Env vars always override DB values when set
    for (const [key, getEnvVal] of Object.entries(ENV_OVERRIDES)) {
      const envVal = getEnvVal();
      if (envVal !== undefined && envVal !== null && envVal !== '') {
        result[key] = envVal;
      }
    }
    // If the request is unauthenticated (no valid Bearer token), mask sensitive values
    const apiKey = process.env.API_KEY
    const authHeader = req.headers.authorization
    const isAuthenticated = !apiKey || (authHeader && authHeader === `Bearer ${apiKey}`)
    if (!isAuthenticated) {
      for (const key of SENSITIVE_KEYS) {
        if (result[key]) result[key] = result[key].slice(0, 8) + '••••••••'
      }
    }
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

// Returns which settings are currently overridden by environment variables.
// NOTE: api_key is NEVER exposed here — this endpoint is public.
// The frontend must have the token entered manually by the user once.
router.get('/env-status', (req, res) => {
  const status = {
    // Which env vars are active
    ai_provider:              !!process.env.AI_PROVIDER,
    ai_api_key:               !!(process.env.AI_API_KEY || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GOOGLE_AI_API_KEY),
    ai_base_url:              !!process.env.AI_BASE_URL,
    ai_model:                 !!process.env.AI_MODEL,
    ai_aws_region:            !!process.env.AI_AWS_REGION,
    ai_aws_access_key_id:     !!process.env.AI_AWS_ACCESS_KEY_ID,
    ai_aws_secret_access_key: !!process.env.AI_AWS_SECRET_ACCESS_KEY,
    s3_bucket:                !!process.env.S3_BUCKET,
    s3_region:                !!process.env.S3_REGION,
    s3_prefix:                !!process.env.S3_PREFIX,
    s3_access_key:            !!process.env.S3_ACCESS_KEY,
    s3_secret_key:            !!process.env.S3_SECRET_KEY,
    s3_endpoint:              !!process.env.S3_ENDPOINT,
    sync_enabled:             !!process.env.SYNC_ENABLED,
    sync_interval:            !!process.env.SYNC_INTERVAL,
    // Only whether API_KEY is set — never the value itself
    api_key_protected:        !!process.env.API_KEY,
  }
  res.json(status)
})

const LIBRARY_TYPES = [
  { key: 'prompts', table: 'prompts', label: 'Prompts', color: '#007AFF', activity_key: 'prompts', path: '/prompts', has_category: true, has_use_count: true, token_fields: ['content'], has_model: true },
  { key: 'skills', table: 'skills', label: 'Skills', color: '#FF9500', activity_key: 'skills', path: '/skills', has_category: true, has_use_count: true, token_fields: ['content'], has_model: false },
  { key: 'steering', table: 'steering', label: 'Steering', color: '#BF5AF2', activity_key: 'steering', path: '/steering', has_category: true, has_use_count: false, token_fields: ['content'], has_model: false },
  { key: 'mcp_configs', table: 'mcp_configs', label: 'MCP', color: '#30D158', activity_key: 'mcp', path: '/mcp', has_category: false, has_use_count: false, token_fields: ['config_json'], has_model: false },
  { key: 'agents', table: 'agents', label: 'Agents', color: '#5E5CE6', activity_key: 'agents', path: '/agents', has_category: false, has_use_count: false, token_fields: ['system_prompt', 'initial_prompt'], has_model: true },
  { key: 'commands', table: 'commands', label: 'Commands', color: '#5AC8FA', activity_key: 'commands', path: '/commands', has_category: true, has_use_count: true, token_fields: ['command'], has_model: false },
  { key: 'snippets', table: 'snippets', label: 'Snippets', color: '#FF6B35', activity_key: 'snippets', path: '/snippets', has_category: true, has_use_count: true, token_fields: ['code'], has_model: false },
  { key: 'notes', table: 'notes', label: 'Notes', color: '#FFD60A', activity_key: 'notes', path: '/notes', has_category: true, has_use_count: false, token_fields: ['content'], has_model: false },
]

const CATEGORY_LIBRARY_TYPES = LIBRARY_TYPES.filter(t => t.has_category)

router.get('/stats', async (req, res) => {
  try {
    const db = getDb();

    // ── Basic counts ─────────────────────────────────────────
    const countRows = await Promise.all(
      LIBRARY_TYPES.map(async (t) => {
        const [row] = await db(t.table).whereNull('deleted_at').count('id as count');
        return { key: t.key, count: parseInt(row.count) };
      })
    );
    const counts = Object.fromEntries(countRows.map(r => [r.key, r.count]));

    const favoriteRows = await Promise.all(
      LIBRARY_TYPES.map(async (t) => {
        const [row] = await db(t.table).whereNull('deleted_at').where('is_favorite', 1).count('id as count');
        return { key: t.key, count: parseInt(row.count) };
      })
    );
    const favoriteCounts = Object.fromEntries(favoriteRows.map(r => [r.key, r.count]));

    const [tc] = await db('tags').count('id as count');

    const localDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const d30 = new Date(Date.now() - 29 * 86400000);
    const d365 = new Date(Date.now() - 364 * 86400000);
    const cutoff30 = localDateStr(d30);
    const cutoff365 = localDateStr(d365);

    // ── Activity last 30 days ─────────────────────────────────
    const activityRows = await Promise.all(
      LIBRARY_TYPES.map(t => db(t.table).whereNull('deleted_at').select('created_at').where('created_at', '>=', cutoff30))
    );

    const actMap = {};
    const baseActivity = Object.fromEntries(LIBRARY_TYPES.map(t => [t.activity_key, 0]));
    const addToMap = (rows, activityKey) => rows.forEach(r => {
      const day = localDateStr(new Date(r.created_at));
      if (!actMap[day]) actMap[day] = { day, ...baseActivity };
      actMap[day][activityKey]++;
    });
    LIBRARY_TYPES.forEach((t, i) => addToMap(activityRows[i], t.activity_key));
    const activity = Object.values(actMap).sort((a, b) => a.day.localeCompare(b.day));

    // ── Usage analytics (dynamic by type) ─────────────────────
    const usageTypes = LIBRARY_TYPES.filter(t => t.has_use_count);
    const usageRows = await Promise.all(
      usageTypes.map(t => db(t.table).whereNull('deleted_at').select('id', 'title', 'use_count').where('use_count', '>', 0).orderBy('use_count', 'desc').limit(8))
    );

    const top_used_items = usageRows
      .flatMap((rows, i) => rows.map(r => ({
        id: r.id,
        title: r.title,
        use_count: r.use_count,
        type: usageTypes[i].key,
        type_label: usageTypes[i].label,
        color: usageTypes[i].color,
        path: usageTypes[i].path,
      })))
      .sort((a, b) => b.use_count - a.use_count)
      .slice(0, 10);

    const usage_by_type = usageTypes.map((t, i) => ({
      type: t.label,
      key: t.key,
      color: t.color,
      count: usageRows[i].reduce((sum, r) => sum + (parseInt(r.use_count) || 0), 0),
    }));

    // Legacy aliases kept for compatibility
    const top_used = top_used_items.filter(i => i.type === 'prompts').map(i => ({ title: i.title, use_count: i.use_count }));

    // ── Token analytics (dynamic by type) ─────────────────────
    const tokenTypes = LIBRARY_TYPES.filter(t => Array.isArray(t.token_fields) && t.token_fields.length > 0);
    const tokenRows = await Promise.all(
      tokenTypes.map(t => db(t.table).whereNull('deleted_at').select(['id', 'title', ...t.token_fields]))
    );
    const rowTokens = (row, fields) => {
      const text = fields.map(f => row[f] || '').join(' ');
      return Math.floor(text.length / 4);
    };
    const total_tokens_by_type = tokenTypes.map((t, i) => ({
      key: t.key,
      type: t.label,
      color: t.color,
      tokens: tokenRows[i].reduce((sum, r) => sum + rowTokens(r, t.token_fields), 0),
    }));

    const top_tokens_items = tokenRows
      .flatMap((rows, i) => rows.map(r => ({
        id: r.id,
        title: r.title,
        type: tokenTypes[i].key,
        type_label: tokenTypes[i].label,
        color: tokenTypes[i].color,
        path: tokenTypes[i].path,
        tokens: rowTokens(r, tokenTypes[i].token_fields),
      })))
      .filter(r => r.tokens > 0)
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 10);

    // Legacy aliases kept for compatibility
    const total_tokens = Object.fromEntries(total_tokens_by_type.map(t => [t.key, t.tokens]));
    const top_tokens = top_tokens_items.filter(i => i.type === 'prompts').map(i => ({ title: i.title, tokens: i.tokens, category: 'general' }));

    // ── Model distribution (dynamic for model-based types) ───
    const modelTypes = LIBRARY_TYPES.filter(t => t.has_model);
    const modelRows = await Promise.all(
      modelTypes.map(t => db(t.table).whereNull('deleted_at').select('model'))
    );
    const modelMap = {};
    modelRows.flat().forEach(r => {
      const m = r.model?.trim() || 'sin modelo';
      modelMap[m] = (modelMap[m] || 0) + 1;
    });
    const model_distribution = Object.entries(modelMap)
      .map(([model, count]) => ({ model, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // ── Favorites by type ─────────────────────────────────────
    const favorites_by_type = LIBRARY_TYPES.map(t => ({
      type: t.label,
      count: favoriteCounts[t.key] || 0,
      color: t.color,
    }));

    // ── Activity heatmap (365 days) ───────────────────────────
    const heatRows = await Promise.all(
      LIBRARY_TYPES.map(t => db(t.table).whereNull('deleted_at').select('created_at').where('created_at', '>=', cutoff365))
    );
    const heatMap = {};
    heatRows.flat().forEach(r => {
      const day = localDateStr(new Date(r.created_at));
      heatMap[day] = (heatMap[day] || 0) + 1;
    });
    const activity_heatmap = heatMap;

    // ── Dashboard 1: Library Health ───────────────────────────
    const [promptsAll, skillsAll, steeringAll, commandsAll, snippetsAll, notesAll, agentsAll, mcpAll] = await Promise.all([
      db('prompts').whereNull('deleted_at').select('description', 'category', 'use_count'),
      db('skills').whereNull('deleted_at').select('description', 'category', 'is_active'),
      db('steering').whereNull('deleted_at').select('description', 'category', 'scope', 'is_active'),
      db('commands').whereNull('deleted_at').select('description', 'category', 'use_count'),
      db('snippets').whereNull('deleted_at').select('description', 'category', 'use_count'),
      db('notes').whereNull('deleted_at').select('description', 'category', 'content'),
      db('agents').whereNull('deleted_at').select('description', 'is_active'),
      db('mcp_configs').whereNull('deleted_at').select('description', 'is_active'),
    ]);

    const totalItems = promptsAll.length + skillsAll.length + steeringAll.length + commandsAll.length + snippetsAll.length + notesAll.length + agentsAll.length + mcpAll.length;
    const itemsWithDesc = [
      ...promptsAll.filter(p => p.description?.trim()),
      ...skillsAll.filter(s => s.description?.trim()),
      ...steeringAll.filter(s => s.description?.trim()),
      ...commandsAll.filter(c => c.description?.trim()),
      ...snippetsAll.filter(s => s.description?.trim()),
      ...agentsAll.filter(a => a.description?.trim()),
      ...mcpAll.filter(m => m.description?.trim()),
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
      snippets_never_used: snippetsAll.filter(s => !s.use_count || s.use_count === 0).length,
      snippets_no_description: snippetsAll.filter(s => !s.description?.trim()).length,
      agents_inactive: agentsAll.filter(a => !a.is_active).length,
      agents_no_description: agentsAll.filter(a => !a.description?.trim()).length,
      mcp_inactive: mcpAll.filter(m => !m.is_active).length,
      total_items: totalItems,
      items_with_description: itemsWithDesc,
    };

    const health_issues = [
      health.prompts_never_used > 0 && { key: 'prompts_never_used', label: `${health.prompts_never_used} prompts never used`, color: '#FF9500', path: '/prompts' },
      health.prompts_no_description > 0 && { key: 'prompts_no_description', label: `${health.prompts_no_description} prompts without description`, color: '#FF9500', path: '/prompts' },
      health.skills_inactive > 0 && { key: 'skills_inactive', label: `${health.skills_inactive} inactive skills`, color: '#BF5AF2', path: '/skills' },
      health.steering_inactive > 0 && { key: 'steering_inactive', label: `${health.steering_inactive} inactive steering`, color: '#BF5AF2', path: '/steering' },
      health.commands_never_used > 0 && { key: 'commands_never_used', label: `${health.commands_never_used} commands never used`, color: '#5AC8FA', path: '/commands' },
      health.snippets_never_used > 0 && { key: 'snippets_never_used', label: `${health.snippets_never_used} snippets never used`, color: '#FF6B35', path: '/snippets' },
      health.snippets_no_description > 0 && { key: 'snippets_no_description', label: `${health.snippets_no_description} snippets without description`, color: '#FF6B35', path: '/snippets' },
      health.notes_no_content > 0 && { key: 'notes_no_content', label: `${health.notes_no_content} empty notes`, color: '#FFD60A', path: '/notes' },
      health.agents_inactive > 0 && { key: 'agents_inactive', label: `${health.agents_inactive} inactive agents`, color: '#5E5CE6', path: '/agents' },
      health.agents_no_description > 0 && { key: 'agents_no_description', label: `${health.agents_no_description} agents without description`, color: '#5E5CE6', path: '/agents' },
      health.mcp_inactive > 0 && { key: 'mcp_inactive', label: `${health.mcp_inactive} inactive MCP configs`, color: '#30D158', path: '/mcp' },
    ].filter(Boolean)
    health.issues = health_issues

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

    const weeklyTables = LIBRARY_TYPES.map(t => t.table);
    const typeMetaByTable = Object.fromEntries(LIBRARY_TYPES.map(t => [t.table, t]));

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
      type: typeMetaByTable[t].label,
      key: typeMetaByTable[t].key,
      path: typeMetaByTable[t].path,
      this_week: weekly_this[t],
      prev_week: weekly_prev[t],
      color: typeMetaByTable[t].color,
    }));

    const weekly_summary = {
      this_week: thisWeekTotal,
      prev_week: prevWeekTotal,
      change_pct: prevWeekTotal > 0 ? Math.round(((thisWeekTotal - prevWeekTotal) / prevWeekTotal) * 100) : null,
      streak_days: streak,
      by_type: weekly_by_type,
    };

    // ── Dashboard 4: Category Distribution (cross-type) ───────
    const catTables = CATEGORY_LIBRARY_TYPES.map(t => ({
      table: t.table,
      label: t.key,
      color: t.color,
    }));
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

    const category_totals = category_distribution
      .map(r => ({ category: r.category, count: r.total }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Legacy alias kept for compatibility
    const by_category = category_totals;

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
      prompts: counts.prompts || 0,
      skills: counts.skills || 0,
      steering: counts.steering || 0,
      mcp_configs: counts.mcp_configs || 0,
      commands: counts.commands || 0,
      notes: counts.notes || 0,
      snippets: counts.snippets || 0,
      agents: counts.agents || 0,
      tags: parseInt(tc.count),
      favorites: {
        prompts: favoriteCounts.prompts || 0,
        skills: favoriteCounts.skills || 0,
        steering: favoriteCounts.steering || 0,
        mcp_configs: favoriteCounts.mcp_configs || 0,
        commands: favoriteCounts.commands || 0,
        notes: favoriteCounts.notes || 0,
        snippets: favoriteCounts.snippets || 0,
        agents: favoriteCounts.agents || 0,
      },
      activity,
      top_used,
      top_used_items,
      usage_by_type,
      by_category,
      category_totals,
      top_tokens,
      top_tokens_items,
      total_tokens,
      total_tokens_by_type,
      model_distribution,
      favorites_by_type,
      activity_heatmap,
      library_types: LIBRARY_TYPES,
      category_types: CATEGORY_LIBRARY_TYPES,
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
