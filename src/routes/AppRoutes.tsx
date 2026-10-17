import { Route, Routes } from 'react-router-dom'
import CartPage from '../pages/CartPage'
import CheckoutConfirmationPage from '../pages/CheckoutConfirmationPage'
import HomePage from '../pages/HomePage'
import LoginPage from '../pages/LoginPage'
import RequireAuth from './RequireAuth'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/cart" element={<CartPage />} />
      </Route>
      <Route path="/checkout/confirmation" element={<CheckoutConfirmationPage />} />
    </Routes>
  )
}

export default AppRoutes
