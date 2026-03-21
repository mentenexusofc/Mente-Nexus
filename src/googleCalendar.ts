const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPES = 'https://www.googleapis.com/auth/calendar'
const CALENDAR_ID = 'primary'

let tokenClient: any = null
let accessToken: string | null = null

export function initGoogle(): Promise<void> {
    return new Promise((resolve) => {
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
                accessToken = resp.access_token
                resolve(resp.access_token)
            },
        })
        tokenClient.requestAccessToken()
    })
}

export function getAccessToken() { return accessToken }

// Buscar eventos
export async function getEventos(dataInicio: string, dataFim: string) {
    const token = accessToken
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
    const data = await res.json()
    return data.items || []
}

// Criar evento
export async function criarEvento(evento: {
    titulo: string
    data: string
    hora: string
    duracao: number
    descricao?: string
}) {
    const token = accessToken
    if (!token) throw new Error('Não autenticado no Google')

    const inicio = new Date(`${evento.data}T${evento.hora}:00`)
    const fim = new Date(inicio.getTime() + evento.duracao * 60000)

    const body = {
        summary: evento.titulo,
        description: evento.descricao || '',
        start: { dateTime: inicio.toISOString(), timeZone: 'America/Sao_Paulo' },
        end: { dateTime: fim.toISOString(), timeZone: 'America/Sao_Paulo' },
    }

    const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events`,
        {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        }
    )
    return res.json()
}

// Atualizar evento
export async function atualizarEvento(eventId: string, evento: {
    titulo: string
    data: string
    hora: string
    duracao: number
    descricao?: string
}) {
    const token = accessToken
    if (!token) throw new Error('Não autenticado no Google')

    const inicio = new Date(`${evento.data}T${evento.hora}:00`)
    const fim = new Date(inicio.getTime() + evento.duracao * 60000)

    const body = {
        summary: evento.titulo,
        description: evento.descricao || '',
        start: { dateTime: inicio.toISOString(), timeZone: 'America/Sao_Paulo' },
        end: { dateTime: fim.toISOString(), timeZone: 'America/Sao_Paulo' },
    }

    const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events/${eventId}`,
        {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        }
    )
    return res.json()
}

// Deletar evento
export async function deletarEvento(eventId: string) {
    const token = accessToken
    if (!token) throw new Error('Não autenticado no Google')

    await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events/${eventId}`,
        {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        }
    )
}