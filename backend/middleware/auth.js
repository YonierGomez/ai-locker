// Optional API key auth — only enforced when API_KEY is set in environment
module.exports = function authMiddleware(req, res, next) {
  const apiKey = process.env.API_KEY
  if (!apiKey) return next()

  // Skip health check
  if (req.path === '/api/health') return next()

  const authHeader = req.headers.authorization
  if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
    return res.status(401).json({ error: 'Unauthorized — provide a valid API key via Authorization: Bearer <key>' })
  }
  next()
}
