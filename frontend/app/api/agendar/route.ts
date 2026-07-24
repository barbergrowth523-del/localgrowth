import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { checkPublicRateLimit } from '@/lib/security/rate-limit'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const datePattern = /^\d{4}-\d{2}-\d{2}$/
const timePattern = /^\d{2}:\d{2}$/
const permanentBarbearias: Record<string, string | undefined> = { jacobina: process.env.BARBEARIA_JACOBINA_ID || 'a2ce084d-84bd-426e-9ec4-cc0f961df556' }

function resolveBarbeariaId(value: string) {
  return permanentBarbearias[value.trim().toLowerCase()]
}

function isRealDate(value: string) {
  if (!datePattern.test(value)) return false
  const date = new Date(value + 'T12:00:00')
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function isValidTime(value: string) {
  if (!timePattern.test(value)) return false
  const [hours, minutes] = value.split(':').map(Number)
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59
}

function errorResponse(message: string, field: string, status = 400) {
  console.error('[api/agendar] validation error', { field, message })
  return NextResponse.json({ error: message, field }, { status })
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const allowed = await checkPublicRateLimit(request, 'agendar:availability', 120, 60)
  if (!allowed) {
    return NextResponse.json({ error: 'Muitas consultas. Tente novamente em instantes.' }, { status: 429 })
  }
  const ownerValue = params.get('barbearia')?.trim() ?? ''
  const date = params.get('date')?.trim() ?? ''
  const barbeariaId = resolveBarbeariaId(ownerValue)
  if (!barbeariaId || !uuidPattern.test(barbeariaId)) return NextResponse.json({ error: 'Link de agendamento invalido.' }, { status: 400 })
  if (!isRealDate(date)) return NextResponse.json({ error: 'Data invalida.', field: 'date' }, { status: 400 })
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ capacity: 1, booked: {} })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const [{ data: profile, error: profileError }, { data: barbers, error: barbersError }, { data: rows, error: appointmentsError }] = await Promise.all([
    supabase.from('perfis_barbearia').select('cadeiras_simultaneas').eq('id', barbeariaId).maybeSingle(),
    supabase.from('equipe').select('id,nome').eq('user_id', barbeariaId).eq('ativo', true).order('nome'),
    supabase.from('agendamentos').select('hora_agendamento').eq('user_id', barbeariaId).eq('data_agendamento', date).eq('status', 'Confirmado'),
  ])
  if (profileError || barbersError || appointmentsError) {
    console.error('[api/agendar] availability lookup failed', { profileError, barbersError, appointmentsError, barbeariaId, date })
    return NextResponse.json({ capacity: 1, booked: {}, barbers: [] })
  }
  const booked: Record<string, number> = {}
  ;(rows ?? []).forEach((row) => {
    const time = String(row.hora_agendamento).slice(0, 5)
    booked[time] = (booked[time] ?? 0) + 1
  })
  return NextResponse.json({ capacity: profile?.cadeiras_simultaneas ?? 1, booked, barbers: barbers ?? [] })
}
export async function POST(request: Request) {
  const allowed = await checkPublicRateLimit(request, 'agendar:create', 10, 600)
  if (!allowed) {
    return NextResponse.json({ error: 'Muitas tentativas. Tente novamente mais tarde.' }, { status: 429 })
  }

  let body: {
    barbearia?: string
    user_id?: string
    userId?: string
    nome?: string
    name?: string
    telefone?: string
    phone?: string
    servicoId?: string
    servico_id?: string
    servico?: string
    date?: string
    data?: string
    data_agendamento?: string
    time?: string
    hora?: string
    hora_agendamento?: string
    barbeiroId?: string
    barbeiro_id?: string
    equipeId?: string
    equipe_id?: string
  }

  try {
    body = await request.json()
  } catch (error) {
    console.error('[api/agendar] invalid json body', error)
    return errorResponse('Corpo da requisicao invalido.', 'body')
  }

  const requestedOwner = body.barbearia || ''
  const barbeariaId = resolveBarbeariaId(requestedOwner)
  const nome = (body.nome || body.name || '').trim()
  const telefone = (body.telefone || body.phone || '').replace(/\D/g, '')
  const servicoId = (body.servicoId || body.servico_id || '').trim()
  const servicoNome = (body.servico || '').trim()
  const date = (body.date || body.data || body.data_agendamento || '').trim()
  const time = (body.time || body.hora || body.hora_agendamento || '').trim()
  const requestedBarberId = (body.equipeId || body.equipe_id || body.barbeiroId || body.barbeiro_id || '').trim()

  if (!barbeariaId || !uuidPattern.test(barbeariaId)) return errorResponse('Link de agendamento invalido.', 'barbearia')
  if (nome.length < 2 || nome.length > 120) return errorResponse('Informe um nome valido.', 'nome')
  if (telefone.length < 8 || telefone.length > 15) return errorResponse('Informe um telefone valido.', 'telefone')
  if (!uuidPattern.test(servicoId) && !servicoNome) return errorResponse('Selecione um servico valido.', 'servicoId')
  if (!isRealDate(date)) return errorResponse('Selecione uma data valida.', 'date')
  if (!isValidTime(time)) return errorResponse('Selecione um horario valido.', 'time')
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[api/agendar] missing Supabase server environment')
    return errorResponse('Agendamento publico nao configurado.', 'server', 500)
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const weekday = new Date(date + 'T12:00:00').getDay()
  const [{ data: profile }, { data: activeBarbers, error: barbersError }, { data: occupiedRows, error: occupiedError }, { data: schedule, error: scheduleError }] = await Promise.all([
    supabase.from('perfis_barbearia').select('cadeiras_simultaneas').eq('id', barbeariaId).maybeSingle(),
    supabase.from('equipe').select('id,nome').eq('user_id', barbeariaId).eq('ativo', true).order('nome'),
    supabase.from('agendamentos').select('equipe_id,barbeiro_id').eq('user_id', barbeariaId).eq('data_agendamento', date).eq('hora_agendamento', time).eq('status', 'Confirmado'),
    supabase.from('expedientes').select('aberto,hora_inicio,hora_fim').eq('user_id', barbeariaId).eq('dia_semana', weekday).maybeSingle(),
  ])
  if (barbersError || occupiedError || scheduleError) {
    console.error('[api/agendar] capacity lookup failed', { barbersError, occupiedError, date, time })
    return errorResponse('Nao foi possivel validar a capacidade.', 'capacity', 500)
  }
  const capacity = Math.min(profile?.cadeiras_simultaneas ?? 1, activeBarbers?.length || profile?.cadeiras_simultaneas || 1)
  if (schedule) {
    const startsAt = String(schedule.hora_inicio).slice(0, 5)
    const endsAt = String(schedule.hora_fim).slice(0, 5)
    if (!schedule.aberto || time < startsAt || time >= endsAt) {
      return errorResponse('A barbearia nao atende neste dia ou horario.', 'time', 409)
    }
  }

  const occupiedCount = occupiedRows?.length ?? 0
  if (occupiedCount >= capacity) return errorResponse('Este horario ja atingiu a capacidade da barbearia.', 'time', 409)

  let assignedBarberId: string | null = null
  if (activeBarbers?.length) {
    if (requestedBarberId) {
      if (!uuidPattern.test(requestedBarberId) || !activeBarbers.some((barber) => barber.id === requestedBarberId)) return errorResponse('Barbeiro invalido.', 'barbeiroId')
      if ((occupiedRows ?? []).some((row) => (row.equipe_id || row.barbeiro_id) === requestedBarberId)) return errorResponse('Este barbeiro ja esta ocupado neste horario.', 'barbeiroId', 409)
      assignedBarberId = requestedBarberId
    } else {
      const occupiedByBarber = new Map<string, number>()
      ;(occupiedRows ?? []).forEach((row) => { const occupiedId = row.equipe_id || row.barbeiro_id
        if (occupiedId) occupiedByBarber.set(occupiedId, (occupiedByBarber.get(occupiedId) ?? 0) + 1) })
      const availableBarber = [...activeBarbers].sort((a, b) => (occupiedByBarber.get(a.id) ?? 0) - (occupiedByBarber.get(b.id) ?? 0)).find((barber) => !occupiedByBarber.get(barber.id))
      if (!availableBarber) return errorResponse('Nenhum barbeiro esta disponivel neste horario.', 'barbeiroId', 409)
      assignedBarberId = availableBarber.id
    }
  }
  let serviceQuery = supabase
    .from('servicos')
    .select('id,nome')
    .eq('user_id', barbeariaId)
    .eq('ativo', true)

  const serviceResult = uuidPattern.test(servicoId)
    ? await serviceQuery.eq('id', servicoId).maybeSingle()
    : await serviceQuery.ilike('nome', servicoNome).limit(1).maybeSingle()
  const service = serviceResult.data
  const serviceError = serviceResult.error

  if (serviceError) {
    console.error('[api/agendar] service lookup failed', { code: serviceError.code, message: serviceError.message, details: serviceError.details })
    return errorResponse('Nao foi possivel validar o servico.', 'servicoId', 500)
  }
  if (!service) return errorResponse('Servico nao encontrado para esta barbearia.', 'servicoId')

  const createdClient = await supabase
    .from('clientes')
    .upsert({
      nome,
      telefone,
      data_ultimo_corte: new Date().toISOString().slice(0, 10),
      user_id: barbeariaId,
      barbearia_id: barbeariaId,
      servico_preferido_id: service.id,
    }, { onConflict: 'user_id,telefone', ignoreDuplicates: true })
    .select('id')
    .maybeSingle()

  if (createdClient.error) {
    console.error('[api/agendar] client insert failed', {
      code: createdClient.error.code,
      message: createdClient.error.message,
      details: createdClient.error.details,
      hint: createdClient.error.hint,
    })
    return errorResponse('Nao foi possivel cadastrar o cliente.', 'cliente', 500)
  }

  let clientId = createdClient.data?.id
  if (!clientId) {
    const existingClient = await supabase
      .from('clientes')
      .select('id')
      .eq('user_id', barbeariaId)
      .eq('telefone', telefone)
      .single()

    if (existingClient.error || !existingClient.data) {
      return errorResponse('Nao foi possivel consultar o cliente.', 'cliente', 500)
    }
    clientId = existingClient.data.id
  }

  const appointment = await supabase
    .rpc('create_public_appointment', {
      p_user_id: barbeariaId,
      p_client_id: clientId,
      p_service_id: service.id,
      p_service_name: service.nome,
      p_date: date,
      p_time: time,
      p_team_id: assignedBarberId,
    })

  if (appointment.error) {
    console.error('[api/agendar] atomic booking failed', {
      code: appointment.error.code,
      message: appointment.error.message,
    })

    const conflictMessages = ['slot_capacity_reached', 'team_member_unavailable', 'outside_business_hours']
    if (appointment.error.code === '23505' || conflictMessages.some((message) => appointment.error.message.includes(message))) {
      return errorResponse('Este horario nao esta mais disponivel.', 'time', 409)
    }
    return errorResponse('Nao foi possivel reservar o horario.', 'agendamento', 500)
  }

  return NextResponse.json({ success: true, appointmentId: appointment.data }, { status: 201 })
}
