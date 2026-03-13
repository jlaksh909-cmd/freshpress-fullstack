const express  = require('express')
const Booking  = require('../models/Booking')
const Order    = require('../models/Order')
const { protect } = require('../middleware/authMiddleware')
const router   = express.Router()

// All booking routes are protected
router.use(protect)

// ── POST /api/bookings ───────────────────────────────────
// Create a new booking + automatically create an Order
router.post('/', async (req, res) => {
  try {
    const { service, serviceId, icon, name, phone, address, date, slot, notes, price, color } = req.body

    if (!service || !name || !phone || !address || !date || !slot)
      return res.status(400).json({ message: 'All required fields must be filled' })

    // 1. Create the Order record (status = 0 = Placed)
    const order = await Order.create({
      userId: req.user._id,
      service, serviceId: serviceId || '', icon: icon || '📦',
      items: [name], date, slot, address,
      price: price || '', color: color || '#f5c842',
      notes: notes || '', status: 0,
    })

    // 2. Create the Booking record
    const booking = await Booking.create({
      userId: req.user._id,
      service, serviceId: serviceId || '', icon: icon || '📦',
      name, phone, address, date, slot,
      notes: notes || '', price: price || '',
      color: color || '#f5c842',
      status: 'confirmed',
      orderId: order._id,
    })

    res.status(201).json({ booking, order })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── GET /api/bookings ────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id }).sort({ createdAt: -1 })
    res.json(bookings)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── PATCH /api/bookings/:id/cancel ───────────────────────
router.patch('/:id/cancel', async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, userId: req.user._id })
    if (!booking) return res.status(404).json({ message: 'Booking not found' })
    if (booking.status === 'cancelled')
      return res.status(400).json({ message: 'Already cancelled' })

    booking.status = 'cancelled'
    await booking.save()

    // Also update the linked order if exists
    if (booking.orderId) {
      await Order.findByIdAndUpdate(booking.orderId, { status: 0 })
    }

    res.json({ message: 'Booking cancelled', booking })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
