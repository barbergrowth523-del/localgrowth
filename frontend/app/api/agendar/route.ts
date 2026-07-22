import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const datePattern = /^\d{4}-\d{2}-\d{2}$/
const timePattern = /^\d{2}:\d{2}$/
const permanentBarbearias: Record<string, string | undefined> = { jacobina: process.env.BARBEARIA_JACOBINA_ID }

function resolveBarbeariaId(value: string) {
  const normalized = value.trim().toLowerCase()
  return uuidPattern.test(value.trim()) ? value.trim() : permanentBarbearias[normalized]
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

export async function POST(request: Request) {
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
  }

  try {
    body = await request.json()
  } catch (error) {
    console.error('[api/agendar] invalid json body', error)
    return errorResponse('Corpo da requisicao invalido.', 'body')
  }

  const requestedOwner = body.barbearia || body.user_id || body.userId || ''
  const barbeariaId = resolveBarbeariaId(requestedOwner)
  const nome = (body.nome || body.name || '').trim()
  const telefone = (body.telefone || body.phone || '').replace(/\D/g, '')
  const servicoId = (body.servicoId || body.servico_id || '').trim()
  const servicoNome = (body.servico || '').trim()
  const date = (body.date || body.data || body.data_agendamento || '').trim()
  const time = (body.time || body.hora || body.hora_agendamento || '').trim()

  if (!barbeariaId || !uuidPattern.test(barbeariaId)) return errorResponse('Link de agendamento invalido.', 'barbearia')
  if (nome.length < 2) return errorResponse('Informe um nome valido.', 'nome')
  if (telefone.length < 8) return errorResponse('Informe um telefone valido.', 'telefone')
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

  const existingClient = await supabase
    .from('clientes')
    .select('id')
    .eq('user_id', barbeariaId)
    .eq('telefone', telefone)
    .maybeSingle()

  if (existingClient.error) {
    console.error('[api/agendar] client lookup failed', { code: existingClient.error.code, message: existingClient.error.message, details: existingClient.error.details })
    return errorResponse('Nao foi possivel consultar o cliente.', 'cliente', 500)
  }

  let clientId = existingClient.data?.id
  if (!clientId) {
    const createdClient = await supabase
      .from('clientes')
      .insert({
        nome,
        telefone,
        data_ultimo_corte: new Date().toISOString().slice(0, 10),
        user_id: barbeariaId,
        barbearia_id: barbeariaId,
        servico_preferido_id: service.id,
      })
      .select('id')
      .single()

    if (createdClient.error || !createdClient.data) {
      console.error('[api/agendar] client insert failed', {
        code: createdClient.error?.code,
        message: createdClient.error?.message,
        details: createdClient.error?.details,
        hint: createdClient.error?.hint,
      })
      return errorResponse('Nao foi possivel cadastrar o cliente.', 'cliente', 500)
    }
    clientId = createdClient.data.id
  }

  const appointment = await supabase
    .from('agendamentos')
    .insert({
      user_id: barbeariaId,
      barbearia_id: barbeariaId,
      cliente_id: clientId,
      servico_id: service.id,
      servico: service.nome,
      data_agendamento: date,
      hora_agendamento: time,
      status: 'Confirmado',
    })

  if (appointment.error) {
    console.error('[api/agendar] appointment insert failed', {
      code: appointment.error.code,
      message: appointment.error.message,
      details: appointment.error.details,
      hint: appointment.error.hint,
      payload: { barbeariaId, clientId, serviceId: service.id, date, time },
    })
    return errorResponse('Nao foi possivel reservar o horario.', 'agendamento', 500)
  }

  return NextResponse.json({ success: true })
}
