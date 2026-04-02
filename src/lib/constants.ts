const DEFAULT_ADMIN_EMAILS = ['matteortner@gmail.com'] as const

function normalizeEmails(input: string): string[] {
  return input
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

function parseAdminEmails(): string[] {
  // In client bundles only NEXT_PUBLIC_* is available. On server, both can exist.
  const configuredServer = process.env.ADMIN_EMAILS ?? ''
  const configuredPublic = process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? ''

  const merged = new Set<string>([
    ...normalizeEmails(configuredServer),
    ...normalizeEmails(configuredPublic),
    ...DEFAULT_ADMIN_EMAILS,
  ])

  return Array.from(merged)
}

export const ADMIN_EMAILS = parseAdminEmails()
