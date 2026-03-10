// src/lib/constants.ts

/** Tipos de resultado que cuentan como leads reales (WhatsApp + formularios Meta) */
export const LEAD_RESULT_TYPES = new Set([
  'onsite_conversion.messaging_conversation_started_7d',
  'onsite_conversion.messaging_conversation_started_30d',
  'onsite_conversion.messaging_conversation_started',
  'onsite_conversion.lead_grouped',
  'lead',
]);

/** Tipos de resultado de vistas de video */
export const VIDEO_RESULT_TYPES = new Set([
  'video_view',
  'video_thruplay_watched_actions',
  'video_p100_watched_actions',
  'video_play_actions',
]);

/** Tipos de resultado de seguidores / me gusta */
export const FOLLOWER_RESULT_TYPES = new Set([
  'like',
  'follow',
  'page_like',
]);
