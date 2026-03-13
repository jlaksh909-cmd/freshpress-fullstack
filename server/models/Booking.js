const mongoose = require('mongoose')

const bookingSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bookingId: { type: String, unique: true },
  service:   { type: String, required: true },
  serviceId: { type: String, default: '' },
  icon:      { type: String, default: '📦' },
  name:      { type: String, required: true },
  phone:     { type: String, required: true },
  address:   { type: String, required: true },
  date:      { type: String, required: true },
  slot:      { type: String, required: true },
  notes:     { type: String, default: '' },
  price:     { type: String, default: '' },
  color:     { type: String, default: '#f5c842' },
  status:    { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'confirmed' },
  orderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  createdAt: { type: Date, default: Date.now },
})

// Auto-generate booking ID before save
bookingSchema.pre('save', function (next) {
  if (!this.bookingId) {
    this.bookingId = `FP-${Math.floor(10000 + Math.random() * 90000)}`
  }
  next()
})

module.exports = mongoose.model('Booking', bookingSchema)
