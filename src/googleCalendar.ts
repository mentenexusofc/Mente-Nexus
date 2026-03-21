const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPES = 'https://www.googleapis.com/auth/calendar'
const CALENDAR_ID = 'primary'
const TOKEN_KEY = 'google_access_token'
const TOKEN_EXPIRY_KEY = 'google_token_expiry'

let tokenClient: any = null

export function getAccessToken(): string | null {
    const token = sessionStorage.getItem(TOKEN_KEY)
    const expiry = sessionStorage.getItem(TOKEN_EXPIRY_KEY)
    if (!token || !expiry) return null
    if (Date.now() > parseInt(expiry)) {
        sessionStorage.removeItem(TOKEN_KEY)
        sessionStorage.removeItem(TOKEN_EXPIRY_KEY)
        return null
    }
    return token
}

function saveToken(token: string, expiresIn: number) {
    sessionStorage.setItem(TOKEN_KEY, token)
    sessionStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + expiresIn * 1000))
}

export function initGoogle(): Promise<void> {
    return new Promise((resolve) => {
        if ((window as any).google?.accounts) { resolve(); return }
        const script = document.createElement('script')
        script.src = 'https://accounts.google.com/gsi/client'
        script.onload = () => resolve()
        document.body.appendChild(script)
    })
}

export function loginGoogle(): Promise<string> {
    return new Promise((resolve, reject) => {
        tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (resp: any) => {
                if (resp.error) { reject(resp.error); return }
                saveToken(resp.access_token, resp.expires_in || 3600)
                resolve(resp.access_token)
            },
        })
        tokenClient.requestAccessToken({ prompt: '' })
    })
}

export async function loginGoogleSilent(): Promise<string | null> {
    const existing = getAccessToken()
    if (existing) return existing
    return new Promise((resolve) => {
        try {
            const client = (window as any).google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                prompt: '',
                callback: (resp: any) => {
                    if (resp.error || !resp.access_token) { resolve(null); return }
                    saveToken(resp.access_token, resp.expires_in || 3600)
                    resolve(resp.access_token)
                },
            })
            client.requestAccessToken({ prompt: '' })
        } catch {
            resolve(null)
        }
    })
}

export async function getEventos(dataInicio: string, dataFim: string) {
    const token = getAccessToken()
    if (!token) throw new Error('Não autenticado no Google')
    const params = new URLSearchParams({
        timeMin: new Date(dataInicio).toISOString(),
        timeMax: new Date(dataFim + 'T23:59:59').toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
    })
    const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
    )
    return (await res.json()).items || []
}

export async function criarEvento(evento: {
    titulo: string; data: string; hora: string; duracao: number; descricao?: string
}) {
    const token = getAccessToken()
    if (!token) throw new Error('Não autenticado no Google')
    const inicio = new Date(`${evento.data}T${evento.hora}:00`)
    const fim = new Date(inicio.getTime() + evento.duracao * 60000)
    const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events`,
        {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                summary: evento.titulo,
                description: evento.descricao || '',
                start: { dateTime: inicio.toISOString(), timeZone: 'America/Sao_Paulo' },
                end: { dateTime: fim.toISOString(), timeZone: 'America/Sao_Paulo' },
            }),
        }
    )
    return res.json()
}

export async function atualizarEvento(eventId: string, evento: {
    titulo: string; data: string; hora: string; duracao: number; descricao?: string
}) {
    const token = getAccessToken()
    if (!token) throw new Error('Não autenticado no Google')
    const inicio = new Date(`${evento.data}T${evento.hora}:00`)
    const fim = new Date(inicio.getTime() + evento.duracao * 60000)
    const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events/${eventId}`,
        {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                summary: evento.titulo,
                description: evento.descricao || '',
                start: { dateTime: inicio.toISOString(), timeZone: 'America/Sao_Paulo' },
                end: { dateTime: fim.toISOString(), timeZone: 'America/Sao_Paulo' },
            }),
        }
    )
    return res.json()
}

export async function deletarEvento(eventId: string) {
    const token = getAccessToken()
    if (!token) throw new Error('Não autenticado no Google')
    await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events/${eventId}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
    )
}