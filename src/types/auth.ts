export type UserRole = 'CLIENT' | 'ADMIN'

export type LoginRequest = {
  email: string
  password: string
}

export type LoginResponse = {
  token: string
  id: string
  name: string
  email: string
  role: UserRole
}

export type AuthSession = LoginResponse
