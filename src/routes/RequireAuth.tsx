import { Navigate, Outlet } from 'react-router-dom'
import { getSession } from '../services/sessionService'
import { CART_LOGIN_REQUIRED_NOTICE } from '../utils/cartAuthentication'

function RequireAuth() {
  return getSession() ? (
    <Outlet />
  ) : (
    <Navigate
      replace
      state={{ notice: CART_LOGIN_REQUIRED_NOTICE }}
      to="/login"
    />
  )
}

export default RequireAuth
