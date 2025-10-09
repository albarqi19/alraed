export type UserRole = 'teacher' | 'admin'

export interface AuthenticatedUser {
  id: number
  name: string
  national_id: string
  role: UserRole
  email?: string | null
  phone?: string | null
  needs_password_change?: boolean
}

export interface LoginPayload {
  national_id: string
  password: string
}

export interface LoginResponse {
  token: string
  user: AuthenticatedUser
  token_type?: string
}
