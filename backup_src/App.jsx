import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage   from './pages/LoginPage'
import HomePage   from './pages/HomePage'
import SignUpPage from './pages/SignUpPage'
import OrdersPage from './pages/OrdersPage'
import HowItWorksPage from './pages/HowItWorksPage'
import PricingPage from './pages/PricingPage'

export default function App() {
  return (
    <Routes>
      <Route path="/"       element={<Navigate to="/login" replace />} />
      <Route path="/login"  element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/home"   element={<HomePage />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/orders" element={<OrdersPage />} />
    </Routes>
  )
}
