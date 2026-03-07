// ─── Platform types ───────────────────────────────────────────────────────────
export type Platform = 'meta' | 'google' | 'tiktok' | 'instagram' | 'linkedin';
export type CampaignStatus = 'active' | 'paused' | 'ended';
export type DateRange = '7d' | '30d' | '90d' | 'all';

// ─── Core data models ─────────────────────────────────────────────────────────
export interface Campaign {
  id: number;
  name: string;
  platform: Platform;
  status: CampaignStatus;
  budget_total: number;
  external_id?: string;
  created_at: string;
}

/** Campaign-level daily metric */
export interface DailyMetric {
  id?: number;
  campaign_id: string;           // stored as string to avoid JS int overflow
  campaign_name: string;
  platform: Platform;
  date: string;                  // ISO: YYYY-MM-DD
  impressions: number;
  clicks: number;
  results: number;               // primary result (messaging_conversation_started_7d)
  conversions: number;           // backward-compat alias = results
  result_type: string;           // action type string
  likes: number;
  shares: number;
  comments: number;
  video_plays: number;
  spent: number;
  reach: number;
  frequency: number;
  cpm: number;
  cpc: number;
  cost_per_result: number;
}

/** Ad Set-level metric with publisher_platform breakdown (Meta) or ad_network_type (Google) */
export interface AdSetMetric {
  id?: number;
  adset_id: string;
  adset_name: string;
  campaign_id: string;
  campaign_name: string;
  platform: Platform;
  network: string;               // facebook | instagram | google_search | google_display | youtube …
  date: string;
  impressions: number;
  clicks: number;
  results: number;
  result_type: string;
  spent: number;
  reach: number;
  frequency: number;
  cpm: number;
  cpc: number;
  cost_per_result: number;
  likes: number;
  comments: number;
  shares: number;
  video_plays: number;
}

/** Ad-level metric with publisher_platform breakdown (Meta) or ad_network_type (Google) */
export interface AdMetric {
  id?: number;
  ad_id: string;
  ad_name: string;
  adset_id: string;
  adset_name: string;
  campaign_id: string;
  campaign_name: string;
  platform: Platform;
  network: string;
  date: string;
  impressions: number;
  clicks: number;
  results: number;
  result_type: string;
  spent: number;
  reach: number;
  frequency: number;
  cpm: number;
  cpc: number;
  cost_per_result: number;
  likes: number;
  comments: number;
  shares: number;
  video_plays: number;
}

export interface SyncLog {
  id?: number;
  synced_at: string;
  platform: Platform | 'all';
  status: 'success' | 'error';
  records_synced: number;
  error_message?: string;
}

// ─── Dashboard aggregated data ─────────────────────────────────────────────────
export interface KpiSummary {
  total_impressions: number;
  total_results: number;          // all results combined
  total_spent: number;
  total_clicks: number;
  total_reach: number;
  total_likes: number;
  total_conversions: number;      // backward-compat = total_results
  // ── Differentiated by objective ──
  total_leads: number;            // WhatsApp + form leads ONLY
  total_video_views: number;      // video view objectives
  total_followers: number;        // page likes + follows
  total_costo_por_lead: number;   // spent / total_leads
  impressions_change: number;
  results_change: number;
  spent_change: number;
  clicks_change: number;
  reach_change: number;
  likes_change: number;
  conversions_change: number;     // backward-compat = results_change
  leads_change: number;
  video_views_change: number;
  followers_change: number;
}

export interface DailyChartPoint {
  date: string;
  clicks: number;
  results: number;
  conversions: number;            // backward-compat = results
  spent: number;
  likes: number;
  impressions: number;
  reach: number;
}

export interface CampaignChartItem {
  name: string;
  clicks: number;
  results: number;
  conversions: number;            // backward-compat
  likes: number;
  spent: number;
  impressions: number;
}

export interface PlatformBudget {
  platform: string;
  label: string;
  spent: number;
  percentage: number;
  color: string;
}

export interface CampaignTableRow {
  id: string;
  name: string;
  platform: Platform;
  status: CampaignStatus;
  impressions: number;
  clicks: number;
  results: number;
  result_type: string;
  ctr: number;
  cpm: number;
  cpc: number;
  cost_per_result: number;
  spent: number;
  reach: number;
  frequency: number;
}

export interface AdSetTableRow {
  id: string;
  adset_name: string;
  campaign_name: string;
  network: string;
  impressions: number;
  clicks: number;
  results: number;
  result_type: string;
  ctr: number;
  cpm: number;
  cpc: number;
  cost_per_result: number;
  spent: number;
  reach: number;
  frequency: number;
}

export interface AdTableRow {
  id: string;
  ad_name: string;
  adset_name: string;
  campaign_name: string;
  network: string;
  impressions: number;
  clicks: number;
  results: number;
  result_type: string;
  ctr: number;
  cpm: number;
  cpc: number;
  cost_per_result: number;
  spent: number;
  reach: number;
}

export interface NetworkBreakdownItem {
  network: string;
  label: string;
  impressions: number;
  clicks: number;
  results: number;
  spent: number;
  percentage: number;
  color: string;
}

export interface DashboardData {
  kpis: KpiSummary;
  dailyChart: DailyChartPoint[];
  campaignChart: CampaignChartItem[];
  platformBudget: PlatformBudget[];
  campaignsTable: CampaignTableRow[];
  adSetsTable: AdSetTableRow[];
  adsTable: AdTableRow[];
  networkBreakdown: NetworkBreakdownItem[];
  lastSync: string | null;
  isMockData: boolean;
}

// ─── API responses ─────────────────────────────────────────────────────────────
export interface MetricsResponse {
  success: boolean;
  data: DashboardData;
  error?: string;
}

export interface SyncResponse {
  success: boolean;
  synced: number;
  platforms: string[];
  error?: string;
}

// ─── CRM Types ────────────────────────────────────────────────────────────────

export type CrmLeadStatus = 'abierto' | 'ganado' | 'perdido';
export type CrmActivityType = 'Llamada' | 'WhatsApp' | 'Email' | 'Reunión' | 'Nota';
export type CrmActivityResult =
  | 'Contactó'
  | 'No contestó'
  | 'Interesado'
  | 'No interesado'
  | 'Propuesta enviada'
  | 'Cerrado';
export type CrmUserRole = 'admin' | 'asesor';
export type CrmLeadOrigin =
  | 'Meta Ads'
  | 'Google Ads'
  | 'TikTok Ads'
  | 'Orgánico'
  | 'Referido'
  | 'WhatsApp'
  | 'Otro';

export interface CrmStage {
  Id: number;
  Nombre: string;
  Orden: number;
  Color: string;
  Es_Ganado: boolean;
  Es_Perdido: boolean;
  Activo: boolean;
}

export interface CrmUser {
  Id: number;
  Nombre: string;
  Email: string;
  Rol: CrmUserRole;
  Activo: boolean;
}

export interface CrmLead {
  Id: number;
  Nombre: string;
  Telefono: string;
  Email: string;
  Empresa: string;
  Origen: CrmLeadOrigin | string;
  ID_Campana: string;
  Nombre_Campana: string;
  Plataforma_Origen: string;
  Valor_Estimado: number;
  Stage_Id: number;
  Stage_Nombre: string;
  Stage_Color?: string;
  Usuario_Id: number;
  Usuario_Nombre: string;
  Fecha_Creacion: string;
  Fecha_Ultimo_Contacto: string;
  Proxima_Accion_Fecha: string;
  Estado: CrmLeadStatus;
  Motivo_Perdida: string;
  Notas: string;
  Fecha_Cierre: string;
  // computed fields (not stored)
  activity_count?: number;
  days_in_stage?: number;
  days_without_activity?: number;
}

export interface CrmActivity {
  Id: number;
  Lead_Id: number;
  Lead_Nombre: string;
  Usuario_Id: number;
  Usuario_Nombre: string;
  Tipo: CrmActivityType;
  Resultado: CrmActivityResult | string;
  Nota: string;
  Fecha: string;
  Proxima_Accion_Fecha: string;
  Proxima_Accion_Nota: string;
}

export interface CrmStats {
  leads_total: number;
  leads_abiertos: number;
  leads_ganados: number;
  leads_perdidos: number;
  leads_esta_semana: number;
  pipeline_total: number;       // suma Valor_Estimado abiertos
  revenue_ganado_mes: number;   // suma Valor_Estimado ganados este mes
  tasa_cierre: number;          // % ganados / (ganados + perdidos)
  ticket_promedio: number;
  leads_sin_actividad: number;  // días sin actividad > 48h
  ciclo_promedio_dias: number;  // días promedio de apertura a cierre
}

// ─── CRM API Responses ────────────────────────────────────────────────────────

export interface CrmLeadsResponse {
  success: boolean;
  data: CrmLead[];
  total: number;
  error?: string;
}

export interface CrmLeadResponse {
  success: boolean;
  data: CrmLead;
  error?: string;
}

export interface CrmStagesResponse {
  success: boolean;
  data: CrmStage[];
  error?: string;
}

export interface CrmActivitiesResponse {
  success: boolean;
  data: CrmActivity[];
  error?: string;
}

export interface CrmStatsResponse {
  success: boolean;
  data: CrmStats;
  error?: string;
}

// ─── Settings (stored in localStorage) ───────────────────────────────────────
export interface AppSettings {
  nocodbUrl: string;
  nocodbApiKey: string;
  metaAccessToken: string;
  metaAdAccountId: string;
  googleRefreshToken: string;
  googleCustomerId: string;
  tiktokAccessToken: string;
  tiktokAdvertiserId: string;
  syncIntervalHours: number;
  useMockData: boolean;
}
