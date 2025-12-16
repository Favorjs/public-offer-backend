const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const registerAdminUser = async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' })
    }

    const existingResult = await pool.query('SELECT 1 FROM admin_users WHERE email = $1 LIMIT 1', [email])
    if (existingResult.rowCount > 0) {
      return res.status(409).json({ success: false, message: 'Admin already exists' })
    }

    const hash = await bcrypt.hash(password, 10)
    await pool.query(
      'INSERT INTO admin_users (email, password, created_at) VALUES ($1, $2, NOW())',
      [email, hash]
    )

    return res.json({ success: true, message: 'Admin registered' })
  } catch (error) {
    console.error('Admin register failed:', error)
    return res.status(500).json({ success: false, message: 'Registration failed' })
  }
}

const loginAdminUser = async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' })
    }

    const adminResult = await pool.query('SELECT email, password FROM admin_users WHERE email = $1 LIMIT 1', [email])
    if (adminResult.rowCount === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }
    const admin = adminResult.rows[0]

    const ok = await bcrypt.compare(password, admin.password)
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }

    const secret = process.env.JWT_SECRET || 'changeme-secret'
    const token = jwt.sign({ id: admin.email, role: 'admin' }, secret, { expiresIn: '12h' })

    return res.json({ success: true, token })
  } catch (error) {
    console.error('Admin login failed:', error)
    return res.status(500).json({ success: false, message: 'Login failed' })
  }
}

module.exports = {
  registerAdminUser,
  loginAdminUser,
}

