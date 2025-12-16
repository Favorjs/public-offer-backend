const jwt = require('jsonwebtoken')

const authMiddleware = (req, res, next) => {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) {
      return res.status(401).json({ success: false, message: 'Unauthorized' })
    }
    const secret = process.env.JWT_SECRET || 'changeme-secret'
    const payload = jwt.verify(token, secret)
    req.user = payload
    return next()
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' })
  }
}

module.exports = authMiddleware

