/**
 * Hash de contraseñas para la DEMO.
 * Se usa SHA-256 con sal fija de aplicación. En producción debe reemplazarse
 * por un backend de autenticación con bcrypt/argon2.
 */

const SALT = 'finpoliza-demo-v1::'

function fallbackHash(input: string): string {
  let h1 = 0x811c9dc5
  let h2 = 0x1000193
  for (let i = 0; i < input.length; i += 1) {
    const c = input.charCodeAt(i)
    h1 = (h1 ^ c) * 0x01000193
    h2 = (h2 + c * 0x85ebca6b) ^ (h1 >>> 13)
  }
  return `fnv$${(h1 >>> 0).toString(16)}${(h2 >>> 0).toString(16)}`
}

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`${SALT}${password}`)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const digest = await crypto.subtle.digest('SHA-256', data)
      return `sha256$${Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')}`
    } catch {
      return fallbackHash(`${SALT}${password}`)
    }
  }
  return fallbackHash(`${SALT}${password}`)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const candidate = await hashPassword(password)
  return candidate === hash
}

export interface PasswordCheck {
  valid: boolean
  score: number
  problems: string[]
}

export function checkPasswordStrength(password: string): PasswordCheck {
  const problems: string[] = []
  if (password.length < 8) problems.push('Debe tener al menos 8 caracteres.')
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(password)) problems.push('Debe incluir al menos una letra.')
  if (!/\d/.test(password)) problems.push('Debe incluir al menos un número.')
  let score = 0
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  return { valid: problems.length === 0, score, problems }
}
