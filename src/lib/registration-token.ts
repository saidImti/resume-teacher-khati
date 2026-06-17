import crypto from 'crypto'

interface RegistrationPayload {
  userId: string
  exp: number
  nonce: string
}

function secret() {
  return (
    process.env.REGISTRATION_LINK_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'dev-registration-secret'
  )
}

function b64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function sign(body: string) {
  return b64url(crypto.createHmac('sha256', secret()).update(body).digest())
}

export function createRegistrationToken(userId: string, days = 90) {
  const payload: RegistrationPayload = {
    userId,
    exp: Math.floor(Date.now() / 1000) + days * 24 * 60 * 60,
    nonce: crypto.randomBytes(12).toString('hex'),
  }
  const body = b64url(JSON.stringify(payload))
  return `${body}.${sign(body)}`
}

export function verifyRegistrationToken(token: string): RegistrationPayload | null {
  const [body, signature] = token.split('.')
  if (!body || !signature) return null
  const expected = sign(body)
  if (signature.length !== expected.length) return null
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as RegistrationPayload
    if (!payload.userId || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}
