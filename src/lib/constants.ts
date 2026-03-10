// src/lib/constants.ts

/**
 * Tipos de resultado que cuentan como leads reales.
 * Meta: WhatsApp + formularios  |  Google/TikTok: conversiones
 *
 * Jerarquía de prioridad (de más específico a más genérico):
 *   1. Mensajes WhatsApp / Messenger (meta)
 *   2. Formularios (meta)
 *   3. Registros / suscripciones (meta)
 *   4. Conversiones genéricas (google, tiktok)
 */
export const LEAD_RESULT_TYPES = new Set([
  // Meta — WhatsApp / Messenger
  'onsite_conversion.messaging_conversation_started_7d',
  'onsite_conversion.messaging_conversation_started_30d',
  'onsite_conversion.messaging_conversation_started',
  // Meta — formularios
  'onsite_conversion.lead_grouped',
  'lead',
  // Meta — registros
  'complete_registration',
  'onsite_conversion.subscribe',
  // Google Ads y TikTok Ads
  'conversion',
]);

/**
 * Tipos de resultado de vistas de video.
 * Solo se suma si la campaña tiene objetivo video.
 */
export const VIDEO_RESULT_TYPES = new Set([
  'video_view',
  'video_thruplay_watched_actions',
  'video_p100_watched_actions',
  'video_play_actions',
]);

/**
 * Tipos de resultado de seguidores / me gusta en página.
 */
export const FOLLOWER_RESULT_TYPES = new Set([
  'like',
  'follow',
  'page_like',
]);
