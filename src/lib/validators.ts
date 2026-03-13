/**
 * validators.ts — Zod schemas for all API request bodies
 *
 * Usage in route handlers:
 *   import { LeadCreateSchema, validate } from '@/lib/validators';
 *
 *   const result = validate(LeadCreateSchema, await req.json());
 *   if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
 *   const data = result.data; // typed
 */
import { z } from 'zod';

// ─── Utility ──────────────────────────────────────────────────────────────────

export interface ValidationOk<T>  { success: true;  data: T }
export interface ValidationErr    { success: false; error: string }
export type ValidationResult<T>   = ValidationOk<T> | ValidationErr;

export function validate<T>(
  schema: z.ZodSchema<T>,
  input: unknown
): ValidationResult<T> {
  const result = schema.safeParse(input);
  if (result.success) return { success: true, data: result.data };
  // Zod v4: .issues (was .errors in v3)
  const issues = (result.error as { issues?: Array<{ path: (string|number)[]; message: string }> }).issues
    ?? (result.error as unknown as { errors?: Array<{ path: (string|number)[]; message: string }> }).errors
    ?? [];
  const messages = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ') || String(result.error);
  return { success: false, error: messages };
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  username: z.string().min(1).max(200).optional(),
  email:    z.string().min(1).max(200).optional(),
  password: z.string().min(1).max(200),
}).refine((d) => d.username || d.email, { message: 'username o email es requerido' });

export const RegisterSchema = z.object({
  email:           z.string().email().max(200),
  nombre:          z.string().min(1).max(100),
  password:        z.string().min(8).max(128),
  role:            z.enum(['admin', 'analista', 'comercial']),
  tenant_id:       z.number().int().optional(),
  tenant_nombre:   z.string().max(100).optional(),
  noco_project_id: z.string().max(200).optional(),
});

// ─── CRM: Leads ───────────────────────────────────────────────────────────────

const COLOMBIA_CITIES = [
  'Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena',
  'Cúcuta', 'Bucaramanga', 'Pereira', 'Santa Marta', 'Ibagué',
  'Pasto', 'Manizales', 'Neiva', 'Villavicencio', 'Armenia',
  'Valledupar', 'Montería', 'Sincelejo', 'Popayán', 'Floridablanca',
  'Soledad', 'Bello', 'Soacha', 'Otra',
] as const;

const CRM_STAGES_VALID = [
  'abierto', 'ganado', 'perdido', 'archivado',
] as const;

const LEAD_ORIGINS = [
  'Meta Ads', 'Google Ads', 'TikTok Ads', 'Orgánico', 'Chatbot Lex', 'Referido', 'Otro',
] as const;

export const LeadCreateSchema = z.object({
  Nombre:            z.string().min(1).max(200),
  Telefono:          z.string().max(30).optional().default(''),
  Email:             z.string().email().max(200).optional().or(z.literal('')),
  Empresa:           z.string().max(200).optional().default(''),
  Origen:            z.enum(LEAD_ORIGINS).optional(),
  Ciudad:            z.string().max(100).optional(),
  ID_Campana:        z.string().max(100).optional().default(''),
  Nombre_Campana:    z.string().max(200).optional().default(''),
  Plataforma_Origen: z.string().max(50).optional().default(''),
  Valor_Estimado:    z.number().min(0).optional().default(0),
  Precio_Plan:       z.number().min(0).optional().default(0),
  Plan_Separe:       z.number().min(0).optional().default(0),
  Comprobante:       z.boolean().optional().default(false),
  Stage_Id:          z.number().int().positive().optional(),
  Stage_Nombre:      z.string().max(100).optional().default(''),
  Stage_Color:       z.string().max(20).optional().default('#3b82f6'),
  Usuario_Id:        z.number().int().positive().optional().default(1),
  Usuario_Nombre:    z.string().max(100).optional().default('Sin asignar'),
  Estado:            z.enum(CRM_STAGES_VALID).optional().default('abierto'),
  Motivo_Perdida:    z.string().max(500).optional().default(''),
  Notas:             z.string().max(2000).optional().default(''),
  Dia_Primer_Contacto:  z.string().max(30).optional(),
  Dia_Cierre:           z.string().max(30).optional(),
  Fecha_Inicio:         z.string().max(30).optional(),
  Proxima_Accion_Fecha: z.string().max(30).optional(),
  Asesor:               z.string().max(100).optional(),
});

export const LeadUpdateSchema = LeadCreateSchema.partial().extend({
  Stage_Id:   z.number().int().positive().optional(),
  Estado:     z.enum(CRM_STAGES_VALID).optional(),
  Fecha_Cierre: z.string().max(30).optional(),
});

// ─── CRM: Activities ─────────────────────────────────────────────────────────

export const ActivityCreateSchema = z.object({
  Lead_Id:             z.number().int().positive(),
  Lead_Nombre:         z.string().max(200).optional().default(''),
  Usuario_Id:          z.number().int().positive().optional().default(1),
  Usuario_Nombre:      z.string().max(100).optional().default(''),
  Tipo:                z.enum(['Llamada', 'WhatsApp', 'Envío de Propuesta', 'Reunión']),
  Resultado:           z.string().max(100).optional().default(''),
  Nota:                z.string().max(2000).optional().default(''),
  Fecha:               z.string().max(30).optional(),
  Proxima_Accion_Fecha: z.string().max(30).optional(),
  Proxima_Accion_Nota:  z.string().max(500).optional().default(''),
});

// ─── Sync ─────────────────────────────────────────────────────────────────────

export const SyncRequestSchema = z.object({
  platforms:  z.array(z.enum(['meta', 'google', 'tiktok', 'all'])).optional().default(['meta', 'google', 'tiktok']),
  days:       z.number().int().min(1).max(365).optional().default(30),
  since:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  until:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  clearFirst: z.boolean().optional().default(false),
});

// ─── Billing ─────────────────────────────────────────────────────────────────

export const CheckoutSchema = z.object({
  plan: z.enum(['starter', 'agencia', 'enterprise']),
});

// ─── Metrics query params ─────────────────────────────────────────────────────

export const MetricsQuerySchema = z.object({
  range:     z.enum(['7d', '30d', '90d', 'all']).optional().default('30d'),
  platform:  z.enum(['meta', 'google', 'tiktok', 'all']).optional().default('all'),
  campaigns: z.string().optional(),   // comma-separated campaign IDs
});
