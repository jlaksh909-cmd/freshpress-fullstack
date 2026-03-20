require('dotenv').config()
const express  = require('express')
const cors     = require('cors')
const connectDB = require('./config/db')

// Connect to MongoDB
connectDB()

const app = express()

// ── Middleware ──────────────────────────────────────────
// In production, you might restrict this to your specific Vercel URL
app.use(cors({ origin: '*', credentials: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// ── Routes ──────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'))
app.use('/api/orders',   require('./routes/orders'))
app.use('/api/bookings', require('./routes/bookings'))

// ── Health check ────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }))

// ── Root route ──────────────────────────────────────────
app.get('/', (req, res) => res.send('🧺 FreshPress API is running...'))

// ── 404 handler ─────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: `Route ${req.originalUrl} not found` }))

// ── Error handler ────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: err.message || 'Internal server error' })
})

// ── Start ────────────────────────────────────────────────
const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`))
