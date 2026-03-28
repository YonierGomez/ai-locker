// Optional API key auth — only enforced when API_KEY is set in environment
module.exports = function authMiddleware(req, res, next) {
  const apiKey = process.env.API_KEY
  if (!apiKey) return next()

  // Public endpoints — always accessible even when API_KEY is set
  const PUBLIC_PATHS = [
    '/health',
    '/settings/env-status',
    '/client-config',
  ]
  if (PUBLIC_PATHS.some(p => req.path === p || req.path.startsWith(p))) return next()

  // GET /settings (read-only, values are masked in the UI) is public so the
  // Settings page can display current config before the user enters their token
  if (req.method === 'GET' && req.path === '/settings') return next()

  const authHeader = req.headers.authorization
  if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
    return res.status(401).json({ error: 'Unauthorized — provide a valid API key via Authorization: Bearer <key>' })
  }
  next()
}
