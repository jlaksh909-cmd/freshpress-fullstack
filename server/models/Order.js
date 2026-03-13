const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  service:   { type: String, required: true },
  serviceId: { type: String, default: '' },
  icon:      { type: String, default: '📦' },
  items:     [{ type: String }],
  date:      { type: String, required: true },
  slot:      { type: String, required: true },
  address:   { type: String, required: true },
  price:     { type: String, default: '' },
  color:     { type: String, default: '#f5c842' },
  // 0=Placed, 1=PickedUp, 2=Cleaning, 3=Ready, 4=Delivered
  status:    { type: Number, default: 0, min: 0, max: 4 },
  notes:     { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
})

module.exports = mongoose.model('Order', orderSchema)
