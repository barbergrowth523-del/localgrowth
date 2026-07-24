import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const permanentBarbearias: Record<string, string | undefined> = { jacobina: process.env.BARBEARIA_JACOBINA_ID || 'a2ce084d-84bd-426e-9ec4-cc0f961df556' }
const defaultSchedule = [
  { dia_semana: 0, aberto: false, hora_inicio: '09:00', hora_fim: '19:00' },
  { dia_semana: 1, aberto: true, hora_inicio: '09:00', hora_fim: '19:00' },
  { dia_semana: 2, aberto: true, hora_inicio: '09:00', hora_fim: '19:00' },
  { dia_semana: 3, aberto: true, hora_inicio: '09:00', hora_fim: '19:00' },
  { dia_semana: 4, aberto: true, hora_inicio: '09:00', hora_fim: '19:00' },
  { dia_semana: 5, aberto: true, hora_inicio: '09:00', hora_fim: '19:00' },
  { dia_semana: 6, aberto: true, hora_inicio: '08:00', hora_fim: '17:00' },
]
function resolveBarbeariaId(value: string) { return permanentBarbearias[value.trim().toLowerCase()] }

export async function GET(request: Request) {
  const value = new URL(request.url).searchParams.get('barbearia')?.trim() ?? ''
  const barbeariaId = resolveBarbeariaId(value)
  if (!barbeariaId || !uuidPattern.test(barbeariaId)) return NextResponse.json({ schedule: defaultSchedule })
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ schedule: defaultSchedule })
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data, error } = await supabase.from('expedientes').select('dia_semana,aberto,hora_inicio,hora_fim').eq('user_id', barbeariaId).order('dia_semana')
  if (error || !data?.length) return NextResponse.json({ schedule: defaultSchedule })
  return NextResponse.json({ schedule: data })
}
