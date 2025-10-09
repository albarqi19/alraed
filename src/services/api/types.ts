export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  errors?: Record<string, string[]>
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  meta?: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}
