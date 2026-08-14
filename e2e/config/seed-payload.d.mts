/** أنواع حمولة البذرة — الشيفرة في seed-payload.mjs (جافاسكربت خالص بلا تبعيات). */

export interface SeedPayload {
  roles?: Record<string, Record<string, string>>
  ids?: Record<string, string | number>
  params?: Record<string, string | number>
  route_params?: Record<string, Record<string, string | number>>
}

export interface CrawlCredentials {
  admin: { nationalId: string; password: string }
  teacher: { nationalId: string; password: string }
  'super-admin': { nationalId: string; password: string }
  guardian: { studentNationalId: string; phoneLast4: string }
}

export function seedPayload(): SeedPayload | null

export function routeParams(): Record<string, string | undefined>

export function perRouteParams(): Record<string, Record<string, string>>

export function credentials(): CrawlCredentials
