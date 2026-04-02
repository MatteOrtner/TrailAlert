function parseAdminEmails(): string[] {
  const configured = process.env.ADMIN_EMAILS
  if (!configured) return []

  return configured
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export const ADMIN_EMAILS = parseAdminEmails()
