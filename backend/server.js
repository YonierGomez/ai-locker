require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const cron = require('node-cron');

const { initDatabase, getDb } = require('./config/database');
const authMiddleware = require('./middleware/auth');
const promptsRouter = require('./routes/prompts');
const skillsRouter = require('./routes/skills');
const steeringRouter = require('./routes/steering');
const mcpRouter = require('./routes/mcp');
const tagsRouter = require('./routes/tags');
const settingsRouter = require('./routes/settings');
const categoriesRouter = require('./routes/categories');
const backupRouter = require('./routes/backup');
const trashRouter = require('./routes/trash');
const commandsRouter = require('./routes/commands');
const aiRouter = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(compression());
// Skip noisy polling GETs; always log mutations and errors
const SILENT_GET_ROUTES = ['/api/settings/stats', '/api/trash/count', '/api/health'];
app.use(morgan('dev', {
  skip: (req, res) =>
    req.method === 'GET' &&
    res.statusCode < 400 &&
    SILENT_GET_ROUTES.some(r => req.path.startsWith(r)),
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Optional API key auth
app.use('/api', authMiddleware);

// API Routes
app.use('/api/prompts', promptsRouter);
app.use('/api/skills', skillsRouter);
app.use('/api/steering', steeringRouter);
app.use('/api/mcp', mcpRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/backup', backupRouter);
app.use('/api/trash', trashRouter);
app.use('/api/commands', commandsRouter);
app.use('/api/ai', aiRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// Serve static frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'frontend/build')));
  app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/build', 'index.html'));
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ── Auto-sync cron job ────────────────────────────────────────
let syncJob = null;

function startSyncJob(intervalMinutes) {
  if (syncJob) { syncJob.stop(); syncJob = null; }
  if (!intervalMinutes || intervalMinutes < 1) return;

  const mins = Math.max(1, parseInt(intervalMinutes));
  let cronExpr;
  if (mins < 60) {
    cronExpr = `*/${mins} * * * *`;
  } else if (mins < 1440) {
    cronExpr = `0 */${Math.floor(mins / 60)} * * *`;
  } else {
    cronExpr = `0 0 */${Math.floor(mins / 1440)} * *`;
  }
  console.log(`⏰ S3 sync scheduled every ${mins} minutes (${cronExpr})`);

  syncJob = cron.schedule(cronExpr, async () => {
    try {
      const db = getDb();
      const rows = await db('settings').select('*');
      const settings = {};
      rows.forEach(r => { settings[r.key] = r.value; });

      if (settings.sync_enabled !== 'true' || !settings.s3_bucket) return;

      const { PutObjectCommand, S3Client } = require('@aws-sdk/client-s3');
      const s3Config = { region: settings.s3_region || 'us-east-1' };
      if (settings.s3_access_key && settings.s3_secret_key) {
        s3Config.credentials = { accessKeyId: settings.s3_access_key, secretAccessKey: settings.s3_secret_key };
      }
      if (settings.s3_endpoint) {
        s3Config.endpoint = settings.s3_endpoint;
        s3Config.forcePathStyle = true;
      }
      const s3 = new S3Client(s3Config);

      const [prompts, skills, steering, mcp_configs, commands, tags, categories, item_tags] = await Promise.all([
        db('prompts').select('*'),
        db('skills').select('*'),
        db('steering').select('*'),
        db('mcp_configs').select('*'),
        db('commands').select('*'),
        db('tags').select('*'),
        db('categories').select('*'),
        db('item_tags').select('*'),
      ]);

      const data = { version: '1.0', exported_at: new Date().toISOString(), prompts, skills, steering, mcp_configs, commands, tags, categories, item_tags };
      const rawPrefix = settings.s3_prefix || 'promptly-backups/';
      const prefix = rawPrefix.endsWith('/') ? rawPrefix : `${rawPrefix}/`;

      await s3.send(new PutObjectCommand({
        Bucket: settings.s3_bucket,
        Key: `${prefix}latest.json`,
        Body: JSON.stringify(data),
        ContentType: 'application/json',
      }));

      const now = new Date().toISOString();
      await db('settings').insert({ key: 'last_s3_sync', value: now, updated_at: now }).onConflict('key').merge();
      console.log(`✅ Auto-sync to S3 completed at ${now}`);
    } catch (err) {
      console.error('❌ Auto-sync failed:', err.message);
    }
  });
}

// ── Daily trash cleanup (3am) ─────────────────────────────────
cron.schedule('0 3 * * *', async () => {
  try {
    const { TABLES, TRASH_DAYS } = require('./routes/trash');
    const db = getDb();
    const cutoff = new Date(Date.now() - TRASH_DAYS * 86400000).toISOString();
    let deleted = 0;
    for (const table of TABLES) {
      const itemType = table === 'mcp_configs' ? 'mcp' : table;
      const ids = (await db(table).whereNotNull('deleted_at').where('deleted_at', '<', cutoff).select('id')).map(r => r.id);
      for (const id of ids) await db('item_tags').where({ item_id: id, item_type: itemType }).delete();
      const count = await db(table).whereNotNull('deleted_at').where('deleted_at', '<', cutoff).delete();
      deleted += count;
    }
    if (deleted > 0) console.log(`🗑️  Auto-purged ${deleted} items from trash`);
  } catch (err) { console.error('❌ Trash cleanup failed:', err.message); }
});

// Expose sync job manager for settings route
app.locals.startSyncJob = startSyncJob;
app.locals.getSyncJob = () => syncJob;

// ── Start server after DB is ready ───────────────────────────
initDatabase()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Promptly API running on port ${PORT}`);
    });

    // Initialize auto-sync if configured
    setTimeout(async () => {
      try {
        const db = getDb();
        const rows = await db('settings').select('*');
        const settings = {};
        rows.forEach(r => { settings[r.key] = r.value; });
        if (settings.sync_enabled === 'true' && settings.s3_bucket) {
          startSyncJob(parseInt(settings.sync_interval) || 60);
        }
      } catch (e) { /* ignore */ }
    }, 2000);
  })
  .catch(err => {
    console.error('❌ Failed to initialize database:', err.message);
    process.exit(1);
  });

module.exports = app;
