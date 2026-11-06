// Who is an admin of the resources app: the same rule as isSystemAdminEmail() in Academy/resources/lib/auth-service.ts (the "Admin" tab of its
// login). This only decides what the login screen says; the real check is the gateway (it refuses anyone who is not an admin).
// No imports on purpose: tested with plain node.
export const ADMIN_EMAILS = ["admin@weareengineer.com", "contact@weareengineer.com", "admin@test.com", "chouk@gmail.com"]

export function isResourcesAdminEmail(email?: string | null): boolean {
  if (!email) return false
  const clean = email.trim().toLowerCase()
  return ADMIN_EMAILS.includes(clean) || clean.startsWith("admin@")
}

export const NOT_ADMIN_MESSAGE = "This app is only for resources admins. This account is not registered as Admin."
