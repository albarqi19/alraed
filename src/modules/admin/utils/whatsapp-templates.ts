import type { WhatsappTemplateVariable } from '../types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

const PLACEHOLDER_REGEX = /\{\{\s*([^{}]+?)\s*\}\}|\{\s*([^{}]+?)\s*\}/g

export type WhatsappPlaceholder = {
  key: string
  placeholder: string
}

export function sanitizeWhatsappVariableKey(raw: string): string {
  return raw
    .replace(/\u200B/g, '')
    .replace(/^[{]+|[}]+$/g, '')
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_')
    .replace(/_{2,}/g, '_')
    .trim()
}

export function formatWhatsappVariableKey(raw: string): string {
  const key = sanitizeWhatsappVariableKey(raw)
  if (!key) {
    return raw.trim()
  }
  return `{{${key}}}`
}

export function humanizeWhatsappVariableKey(raw: string): string {
  const key = sanitizeWhatsappVariableKey(raw)
  if (!key) {
    return raw.trim()
  }
  return key.replace(/_/g, ' ')
}

export function extractWhatsappPlaceholders(body: string): WhatsappPlaceholder[] {
  if (typeof body !== 'string' || body.length === 0) {
    return []
  }

  const placeholders = new Map<string, WhatsappPlaceholder>()
  let match: RegExpExecArray | null

  while ((match = PLACEHOLDER_REGEX.exec(body)) !== null) {
    const rawKey = (match[1] ?? match[2] ?? '').trim()
    if (!rawKey) continue

    const key = sanitizeWhatsappVariableKey(rawKey)
    if (!key || placeholders.has(key)) continue

    placeholders.set(key, { key, placeholder: `{{${key}}}` })
  }

  return Array.from(placeholders.values())
}

export function deserializeWhatsappVariables(raw: unknown, fallbackBody?: string): WhatsappTemplateVariable[] {
  const seen = new Set<string>()
  const variables: WhatsappTemplateVariable[] = []

  const addVariable = (keySource: string, labelSource?: string, exampleSource?: string) => {
    const sanitized = sanitizeWhatsappVariableKey(keySource)
    if (!sanitized || seen.has(sanitized)) {
      return
    }

    seen.add(sanitized)

    const label = (labelSource ?? '').trim() || humanizeWhatsappVariableKey(sanitized)
    const example = (exampleSource ?? '').trim()

    const variable: WhatsappTemplateVariable = {
      key: formatWhatsappVariableKey(sanitized),
      label,
    }

    if (example) {
      variable.example = example
    }

    variables.push(variable)
  }

  const processValue = (value: unknown, keyHint?: string) => {
    if (value == null) {
      return
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value)
        processValue(parsed, keyHint)
        return
      } catch {
        if (keyHint) {
          addVariable(keyHint, value)
        } else {
          addVariable(value, value)
        }
        return
      }
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (typeof entry === 'string') {
          addVariable(entry, entry)
          return
        }

        if (isRecord(entry)) {
          const keyCandidate =
            typeof entry.key === 'string'
              ? entry.key
              : typeof entry.name === 'string'
                ? entry.name
                : typeof entry.placeholder === 'string'
                  ? entry.placeholder
                  : keyHint ?? ''

          const labelCandidate =
            typeof entry.label === 'string'
              ? entry.label
              : typeof entry.description === 'string'
                ? entry.description
                : typeof entry.title === 'string'
                  ? entry.title
                  : typeof entry.name === 'string'
                    ? entry.name
                    : undefined

          const exampleCandidate =
            typeof entry.example === 'string'
              ? entry.example
              : typeof entry.sample === 'string'
                ? entry.sample
                : undefined

          addVariable(keyCandidate, labelCandidate, exampleCandidate)
        }
      })
      return
    }

    if (isRecord(value)) {
      Object.entries(value).forEach(([rawKey, rawValue]) => {
        if (typeof rawValue === 'string') {
          addVariable(rawKey, rawValue)
          return
        }

        if (isRecord(rawValue)) {
          const labelCandidate =
            typeof rawValue.label === 'string'
              ? rawValue.label
              : typeof rawValue.description === 'string'
                ? rawValue.description
                : typeof rawValue.title === 'string'
                  ? rawValue.title
                  : undefined

          const exampleCandidate =
            typeof rawValue.example === 'string'
              ? rawValue.example
              : typeof rawValue.sample === 'string'
                ? rawValue.sample
                : undefined

          addVariable(rawKey, labelCandidate, exampleCandidate)
          return
        }

        if (Array.isArray(rawValue)) {
          rawValue.forEach((entry) => processValue(entry, rawKey))
        }
      })
    }
  }

  processValue(raw)

  if (!variables.length && typeof fallbackBody === 'string' && fallbackBody.length > 0) {
    extractWhatsappPlaceholders(fallbackBody).forEach(({ key }) => {
      if (!seen.has(key)) {
        addVariable(key, humanizeWhatsappVariableKey(key))
      }
    })
  }

  return variables
}

export function serializeWhatsappVariables(
  variables: WhatsappTemplateVariable[],
): Record<string, { label: string; example?: string }> {
  const map: Record<string, { label: string; example?: string }> = {}

  variables.forEach((variable) => {
    const sanitized = sanitizeWhatsappVariableKey(variable.key)
    if (!sanitized) {
      return
    }

    const label = (variable.label ?? '').trim() || humanizeWhatsappVariableKey(sanitized)
    const example = (variable.example ?? '').trim()

    const entry: { label: string; example?: string } = { label }

    if (example) {
      entry.example = example
    }

    map[sanitized] = entry
  })

  return map
}
