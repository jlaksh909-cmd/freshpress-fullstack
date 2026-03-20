const express  = require('express')
const Order    = require('../models/Order')
const { protect } = require('../middleware/authMiddleware')
const router   = express.Router()

// All order routes are protected
router.use(protect)

// ── GET /api/orders ──────────────────────────────────────
// Get all orders for the logged-in user
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 })
    res.json(orders)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── GET /api/orders/:id ──────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user._id })
    if (!order) return res.status(404).json({ message: 'Order not found' })
    res.json(order)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── PATCH /api/orders/:id/status ─────────────────────────
// Update order status (admin-style — for demo use)
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body
    if (status === undefined || status < 0 || status > 5)
      return res.status(400).json({ message: 'Invalid status (0–5)' })
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status },
      { new: true }
    )
    if (!order) return res.status(404).json({ message: 'Order not found' })
    res.json(order)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
