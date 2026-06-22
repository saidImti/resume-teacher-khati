const PINTEREST_API = 'https://api.pinterest.com/v5'
const PINTEREST_AUTH = 'https://www.pinterest.com/oauth/'
const PINTEREST_TOKEN = `${PINTEREST_API}/oauth/token`

export const PINTEREST_SCOPES = 'pins:read,pins:write,boards:read,boards:write'

export function getPinterestAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id:    process.env.PINTEREST_APP_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/pinterest/callback`,
    response_type: 'code',
    scope:        PINTEREST_SCOPES,
    state,
  })
  return `${PINTEREST_AUTH}?${params.toString()}`
}

export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}> {
  const credentials = Buffer.from(
    `${process.env.PINTEREST_APP_ID}:${process.env.PINTEREST_APP_SECRET}`
  ).toString('base64')

  const res = await fetch(PINTEREST_TOKEN, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type:   'authorization_code',
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/pinterest/callback`,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Pinterest token exchange failed: ${text}`)
  }

  return res.json()
}

export async function refreshPinterestToken(refreshToken: string): Promise<{
  access_token: string
  refresh_token?: string
  expires_in: number
}> {
  const credentials = Buffer.from(
    `${process.env.PINTEREST_APP_ID}:${process.env.PINTEREST_APP_SECRET}`
  ).toString('base64')

  const res = await fetch(PINTEREST_TOKEN, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!res.ok) throw new Error('Pinterest token refresh failed')
  return res.json()
}

export async function getPinterestUserInfo(accessToken: string) {
  const res = await fetch(`${PINTEREST_API}/user_account`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Pinterest user info failed')
  return res.json() as Promise<{
    username: string
    id: string
    profile_image: string
    website_url: string
    account_type: string
  }>
}

export async function getPinterestBoards(accessToken: string) {
  const res = await fetch(`${PINTEREST_API}/boards?page_size=50`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Pinterest boards fetch failed')
  const data = await res.json()
  return data.items as Array<{
    id: string
    name: string
    description: string
    privacy: string
    pin_count: number
    media: { image_cover_url?: string }
  }>
}

export async function createPinterestPin(accessToken: string, opts: {
  board_id: string
  title: string
  description: string
  link?: string
  media_source: { source_type: 'image_url'; url: string } | { source_type: 'image_base64'; content_type: string; data: string }
}) {
  const res = await fetch(`${PINTEREST_API}/pins`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(opts),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Create pin failed: ${err}`)
  }
  return res.json()
}
