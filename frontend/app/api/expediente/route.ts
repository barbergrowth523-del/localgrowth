import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { resolvePublicBarbershop } from '@/lib/public-barbershop'

const defaultSchedule = [
  { dia_semana: 0, aberto: false, hora_inicio: '09:00', hora_fim: '19:00' },
  { dia_semana: 1, aberto: true, hora_inicio: '09:00', hora_fim: '19:00' },
  { dia_semana: 2, aberto: true, hora_inicio: '09:00', hora_fim: '19:00' },
  { dia_semana: 3, aberto: true, hora_inicio: '09:00', hora_fim: '19:00' },
  { dia_semana: 4, aberto: true, hora_inicio: '09:00', hora_fim: '19:00' },
  { dia_semana: 5, aberto: true, hora_inicio: '09:00', hora_fim: '19:00' },
  { dia_semana: 6, aberto: true, hora_inicio: '08:00', hora_fim: '17:00' },
]

export async function GET(request: Request) {
  const value = new URL(request.url).searchParams.get('barbearia')?.trim() ?? ''
  const shop = await resolvePublicBarbershop(value)
  const barbeariaId = shop?.id
  if (!barbeariaId) return NextResponse.json({ schedule: defaultSchedule })
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ schedule: defaultSchedule })
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data, error } = await supabase.from('expedientes').select('dia_semana,aberto,hora_inicio,hora_fim').eq('user_id', barbeariaId).order('dia_semana')
  if (error || !data?.length) return NextResponse.json({ schedule: defaultSchedule })
  return NextResponse.json({ schedule: data })
}
