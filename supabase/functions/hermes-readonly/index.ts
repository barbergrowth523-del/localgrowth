import { createClient } from "npm:@supabase/supabase-js@2.50.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const HERMES_TOKEN = Deno.env.get("HERMES_READONLY_TOKEN") ?? "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

function countBy<T extends string | number | null>(
  rows: Array<Record<string, unknown>>,
  field: string,
) {
  const out: Record<string, number> = {};
  for (const row of rows) {
    const value = row[field] as T;
    const key = value === null || value === undefined ? "UNKNOWN" : String(value);
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

async function exactCount(table: string, filters?: (q: any) => any) {
  let query = supabase.from(table).select("*", {
    count: "exact",
    head: true,
  });

  if (filters) query = filters(query);

  const { count, error } = await query;

  if (error) throw new Error(`${table}: ${error.message}`);

  return count ?? 0;
}

async function overview() {
  const [
    barbershops,
    customers,
    appointments,
    subscriptions,
    rescues,
  ] = await Promise.all([
    exactCount("perfis_barbearia"),
    exactCount("clientes"),
    exactCount("agendamentos"),
    exactCount("asaas_subscriptions"),
    exactCount("resgates_automaticos"),
  ]);

  const { data: profiles, error: profileError } = await supabase
    .from("perfis_barbearia")
    .select("plano,acesso_bloqueado,renovacao_automatica")
    .limit(1000);

  if (profileError) throw new Error(profileError.message);

  const { data: subs, error: subsError } = await supabase
    .from("asaas_subscriptions")
    .select("plan,billing_period,status")
    .limit(1000);

  if (subsError) throw new Error(subsError.message);

  return {
    barbershops,
    customers,
    appointments,
    subscriptions,
    automatic_rescues: rescues,
    barbershops_by_plan: countBy(profiles ?? [], "plano"),
    blocked_barbershops: (profiles ?? []).filter(
      (x) => x.acesso_bloqueado === true,
    ).length,
    subscriptions_by_status: countBy(subs ?? [], "status"),
    subscriptions_by_plan: countBy(subs ?? [], "plan"),
    subscriptions_by_period: countBy(subs ?? [], "billing_period"),
  };
}

async function customers() {
  const total = await exactCount("clientes");

  const { data: customers, error } = await supabase
    .from("clientes")
    .select("data_ultimo_corte,created_at")
    .limit(1000);

  if (error) throw new Error(error.message);

  const today = Date.now();

  let inactive30 = 0;
  let inactive60 = 0;
  let inactive90 = 0;

  for (const row of customers ?? []) {
    if (!row.data_ultimo_corte) continue;

    const age =
      (today - new Date(`${row.data_ultimo_corte}T00:00:00Z`).getTime()) /
      86_400_000;

    if (age >= 30) inactive30++;
    if (age >= 60) inactive60++;
    if (age >= 90) inactive90++;
  }

  const { data: dispatches, error: dispatchError } = await supabase
    .from("historico_disparos")
    .select("status,enviado_em")
    .limit(1000);

  if (dispatchError) throw new Error(dispatchError.message);

  const { data: rescues, error: rescueError } = await supabase
    .from("resgates_automaticos")
    .select("status,tentativas,agendado_para,enviado_em,created_at")
    .limit(1000);

  if (rescueError) throw new Error(rescueError.message);

  return {
    total_customers: total,
    sampled_customers: customers?.length ?? 0,
    inactive_30_days: inactive30,
    inactive_60_days: inactive60,
    inactive_90_days: inactive90,
    dispatches_by_status: countBy(dispatches ?? [], "status"),
    rescues_by_status: countBy(rescues ?? [], "status"),
  };
}

async function operations() {
  const totalAppointments = await exactCount("agendamentos");
  const activeServices = await exactCount(
    "servicos",
    (q) => q.eq("ativo", true),
  );
  const activeTeam = await exactCount(
    "equipe",
    (q) => q.eq("ativo", true),
  );

  const { data: appointments, error } = await supabase
    .from("agendamentos")
    .select("status,data_agendamento,nota_avaliacao")
    .limit(1000);

  if (error) throw new Error(error.message);

  const ratings = (appointments ?? [])
    .map((x) => Number(x.nota_avaliacao))
    .filter((x) => Number.isFinite(x) && x >= 1 && x <= 5);

  const averageRating = ratings.length
    ? Number(
        (
          ratings.reduce((sum, value) => sum + value, 0) /
          ratings.length
        ).toFixed(2),
      )
    : null;

  const { data: services, error: serviceError } = await supabase
    .from("servicos")
    .select("preco,duracao_minutos,ativo")
    .limit(1000);

  if (serviceError) throw new Error(serviceError.message);

  const active = (services ?? []).filter((x) => x.ativo === true);
  const servicePrices = active
    .map((x) => Number(x.preco))
    .filter(Number.isFinite);

  return {
    total_appointments: totalAppointments,
    appointments_by_status: countBy(appointments ?? [], "status"),
    active_services: activeServices,
    active_team_members: activeTeam,
    average_rating: averageRating,
    ratings_count: ratings.length,
    average_active_service_price: servicePrices.length
      ? Number(
          (
            servicePrices.reduce((sum, value) => sum + value, 0) /
            servicePrices.length
          ).toFixed(2),
        )
      : null,
  };
}

async function finance() {
  const total = await exactCount("asaas_subscriptions");

  const { data: rows, error } = await supabase
    .from("asaas_subscriptions")
    .select(
      "plan,billing_period,status,trial_started_at,trial_ends_at,last_payment_confirmed_at,created_at,updated_at",
    )
    .limit(1000);

  if (error) throw new Error(error.message);

  return {
    total_subscriptions: total,
    by_status: countBy(rows ?? [], "status"),
    by_plan: countBy(rows ?? [], "plan"),
    by_billing_period: countBy(rows ?? [], "billing_period"),
  };
}

async function automation() {
  const [
    rescuesTotal,
    scheduledTotal,
    publicationTotal,
    socialTotal,
  ] = await Promise.all([
    exactCount("resgates_automaticos"),
    exactCount("scheduled_posts"),
    exactCount("publication_logs"),
    exactCount("social_accounts"),
  ]);

  const [
    rescuesResult,
    scheduledResult,
    publicationResult,
    socialResult,
  ] = await Promise.all([
    supabase
      .from("resgates_automaticos")
      .select("status,tentativas,agendado_para,enviado_em,created_at")
      .limit(1000),

    supabase
      .from("scheduled_posts")
      .select(
        "media_type,platforms,scheduled_for,status,published_at,retry_count,created_at",
      )
      .limit(1000),

    supabase
      .from("publication_logs")
      .select("platform,status,attempt,started_at,completed_at,created_at")
      .limit(1000),

    supabase
      .from("social_accounts")
      .select(
        "platform,status,access_token_expires_at,refresh_token_expires_at,last_refresh_at,reconnect_required_at",
      )
      .limit(100),
  ]);

  for (const result of [
    rescuesResult,
    scheduledResult,
    publicationResult,
    socialResult,
  ]) {
    if (result.error) throw new Error(result.error.message);
  }

  return {
    automatic_rescues: {
      total: rescuesTotal,
      by_status: countBy(rescuesResult.data ?? [], "status"),
    },
    scheduled_posts: {
      total: scheduledTotal,
      by_status: countBy(scheduledResult.data ?? [], "status"),
      by_media_type: countBy(scheduledResult.data ?? [], "media_type"),
    },
    publications: {
      total: publicationTotal,
      by_status: countBy(publicationResult.data ?? [], "status"),
      by_platform: countBy(publicationResult.data ?? [], "platform"),
    },
    social_accounts: {
      total: socialTotal,
      by_status: countBy(socialResult.data ?? [], "status"),
      by_platform: countBy(socialResult.data ?? [], "platform"),
    },
  };
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return json({ error: "method_not_allowed" }, 405);
    }

    if (!HERMES_TOKEN || req.headers.get("x-hermes-token") !== HERMES_TOKEN) {
      return json({ error: "unauthorized" }, 401);
    }

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return json({ error: "server_configuration_error" }, 500);
    }

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return json({ error: "invalid_json" }, 400);
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      Object.keys(body as Record<string, unknown>).some(
        (key) => key !== "dataset",
      )
    ) {
      return json({ error: "invalid_request" }, 400);
    }

    const dataset = (body as Record<string, unknown>).dataset;

    if (typeof dataset !== "string") {
      return json({ error: "dataset_required" }, 400);
    }

    let data: unknown;

    switch (dataset) {
      case "overview":
        data = await overview();
        break;
      case "customers":
        data = await customers();
        break;
      case "operations":
        data = await operations();
        break;
      case "finance":
        data = await finance();
        break;
      case "automation":
        data = await automation();
        break;
      default:
        return json({ error: "dataset_not_allowed" }, 400);
    }

    return json({
      ok: true,
      dataset,
      generated_at: new Date().toISOString(),
      data,
    });
  } catch (error) {
    console.error("[hermes-readonly]", error);

    return json(
      {
        error: "internal_error",
      },
      500,
    );
  }
});
