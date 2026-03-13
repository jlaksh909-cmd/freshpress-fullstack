const express = require('express')
const jwt     = require('jsonwebtoken')
const User    = require('../models/User')
const router  = express.Router()

// Helper: generate JWT
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' })

// ── POST /api/auth/register ──────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body

    if (!name || !email || !password)
      return res.status(400).json({ message: 'Name, email and password are required' })

    const exists = await User.findOne({ email })
    if (exists)
      return res.status(400).json({ message: 'Email already registered' })

    const user = await User.create({ name, email, password, phone: phone || '' })

    res.status(201).json({
      _id:   user._id,
      name:  user.name,
      email: user.email,
      phone: user.phone,
      token: generateToken(user._id),
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── POST /api/auth/login ─────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' })

    const user = await User.findOne({ email })
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid email or password' })

    res.json({
      _id:   user._id,
      name:  user.name,
      email: user.email,
      phone: user.phone,
      token: generateToken(user._id),
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── GET /api/auth/me ─────────────────────────────────────
const { protect } = require('../middleware/authMiddleware')
router.get('/me', protect, async (req, res) => {
  res.json({
    _id:   req.user._id,
    name:  req.user.name,
    email: req.user.email,
    phone: req.user.phone,
  })
})

module.exports = router
