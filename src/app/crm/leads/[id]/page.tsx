'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import type { CrmLead, CrmActivity, CrmStage } from '@/types';
import { formatCOP } from '@/lib/format';
import ActivityModal from '@/components/crm/ActivityModal';
import { useToast } from '@/components/Toast';
import { ASESORES, LEAD_ORIGINS, ACTIVITY_ICONS, COLOMBIA_CITIES, ORIGIN_COLOR } from '@/lib/crmConstants';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  const p = name.trim().split(' ').filter(Boolean);
  if (!p.length) return '?';
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[1][0]).toUpperCase();
}
function getAvatarColor(name: string) {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#3b82f6', '#14b8a6', '#f59e0b', '#10b981'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}
function toWALink(phone: string) {
  const clean = phone.replace(/\D/g, '');
  return `https://wa.me/${clean.startsWith('57') ? clean : `57${clean}`}`;
}
function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
}
function fmtDateTime(d: string | null | undefined) {
  if (!d) return '—';
  try { return new Date(d).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  catch { return d; }
}

const STAGE_STATUS: Record<string, { bg: string; color: string; label: string }> = {
  abierto:   { bg: 'rgba(99,102,241,0.12)',  color: '#818cf8', label: 'En pipeline' },
  ganado:    { bg: 'rgba(16,185,129,0.12)',  color: '#10b981', label: 'Cliente Pagó' },
  perdido:   { bg: 'rgba(248,113,113,0.12)', color: '#f87171', label: 'Negocio Perdido' },
  archivado: { bg: 'rgba(156,163,175,0.12)', color: '#9ca3af', label: 'Archivado' },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router  = useRouter();
  const toast   = useToast();

  const [lead,         setLead]         = useState<CrmLead | null>(null);
  const [activities,   setActivities]   = useState<CrmActivity[]>([]);
  const [stages,       setStages]       = useState<CrmStage[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showActModal, setShowActModal] = useState(false);
  const [editMode,     setEditMode]     = useState(false);
  const [saving,       setSaving]       = useState(false);

  // Estado editable local
  const [draft, setDraft] = useState<Partial<CrmLead>>({});

  // ── Fetchers ────────────────────────────────────────────────────────────────

  const fetchLead = useCallback(async () => {
    try {
      const res  = await fetch(`/api/crm/leads/${id}`);
      const json = await res.json();
      if (json.success) { setLead(json.data); setDraft(json.data); }
      else toast.error('Lead no encontrado');
    } catch { toast.error('Error al cargar el lead'); }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchActivities = useCallback(async () => {
    try {
      const res  = await fetch(`/api/crm/activities?leadId=${id}`);
      const json = await res.json();
      if (json.success) setActivities(json.data ?? []);
    } catch { /* silent */ }
  }, [id]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const [, , sr] = await Promise.allSettled([
        fetchLead(),
        fetchActivities(),
        fetch('/api/crm/stages').then(r => r.json()),
      ]);
      if (sr.status === 'fulfilled' && sr.value?.success) setStages(sr.value.data ?? []);
      setLoading(false);
    };
    init();
  }, [fetchLead, fetchActivities]);

  // ── Patch helper ─────────────────────────────────────────────────────────────

  const patch = useCallback(async (updates: Partial<CrmLead>) => {
    try {
      const res  = await fetch(`/api/crm/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setLead((prev) => prev ? { ...prev, ...updates } : prev);
    } catch (e) {
      toast.error(`Error al guardar: ${e instanceof Error ? e.message : String(e)}`);
      throw e;
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveEdit = async () => {
    if (!lead) return;
    setSaving(true);
    try {
      const selectedStage = stages.find((s) => s.Id === Number(draft.Stage_Id));
      const payload = {
        ...draft,
        Stage_Nombre: selectedStage?.Nombre || lead.Stage_Nombre,
        Stage_Color:  selectedStage?.Color  || lead.Stage_Color,
        Valor_Estimado: draft.Precio_Plan || 0,
      };
      await patch(payload);
      setEditMode(false);
      toast.success('Lead actualizado');
    } catch { /* error ya mostrado por patch */ }
    finally { setSaving(false); }
  };

  const handleMarkStatus = async (status: 'ganado' | 'perdido') => {
    const stage = status === 'ganado' ? stages.find(s => s.Es_Ganado) : stages.find(s => s.Es_Perdido);
    await patch({
      Estado:       status,
      Stage_Id:     stage?.Id,
      Stage_Nombre: stage?.Nombre || (status === 'ganado' ? 'Cliente Pagó' : 'Negocio Perdido'),
      Stage_Color:  stage?.Color  || (status === 'ganado' ? '#10b981' : '#ef4444'),
      Fecha_Cierre: new Date().toISOString(),
    } as Partial<CrmLead>);
    toast.success(status === 'ganado' ? 'Lead → Cliente Pagó' : 'Lead → Negocio Perdido');
    fetchLead();
  };

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
        <div className="px-4 md:px-6 py-4 border-b flex items-center gap-3"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <div className="skeleton h-8 w-8 rounded-full" />
          <div className="skeleton h-5 w-48" />
        </div>
        <div className="p-6 flex flex-col gap-4 max-w-5xl mx-auto w-full">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4" style={{ background: 'var(--bg)' }}>
        <p className="text-lg font-bold" style={{ color: 'var(--text)' }}>Lead no encontrado</p>
        <button onClick={() => router.push('/crm')} className="btn btn-primary">Volver al CRM</button>
      </div>
    );
  }

  const statusStyle  = STAGE_STATUS[lead.Estado] ?? STAGE_STATUS.abierto;
  const avatarColor  = getAvatarColor(lead.Nombre);
  const currentStage = stages.find(s => s.Id === lead.Stage_Id);
  const originColor  = ORIGIN_COLOR[lead.Origen] ?? '#6b7280';
  const leadId       = `#SEM-${String(lead.Id).padStart(3, '0')}`;

  const selectStyle = {
    paddingRight: 32, appearance: 'none' as const,
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238888a0' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat' as const, backgroundPosition: 'right 10px center' as const,
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>

      {/* ── Header ── */}
      <div className="sticky top-0 z-20 px-4 md:px-6 py-3 border-b flex items-center gap-3 flex-wrap"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <button onClick={() => router.push('/crm')} className="btn btn-ghost btn-icon" title="Volver al CRM">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs flex-shrink-0"
          style={{ background: `${avatarColor}cc` }}>
          {getInitials(lead.Nombre)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-sm truncate" style={{ color: 'var(--text)' }}>{lead.Nombre}</h1>
            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ background: 'var(--surface3)', color: 'var(--muted)' }}>
              {leadId}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: `${originColor}18`, color: originColor }}>
              {lead.Origen}
            </span>
            {lead.Ciudad && (
              <span className="text-xs" style={{ color: 'var(--muted2)' }}>{lead.Ciudad}</span>
            )}
            {lead.Usuario_Nombre && (
              <span className="text-xs" style={{ color: 'var(--muted2)' }}>· {lead.Usuario_Nombre}</span>
            )}
          </div>
        </div>

        <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
          style={{ background: statusStyle.bg, color: statusStyle.color }}>
          {statusStyle.label}
        </span>

        {lead.Estado === 'abierto' && (
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => handleMarkStatus('ganado')} className="btn btn-success" style={{ fontSize: 11, padding: '5px 12px' }}>
              ✓ Cliente Pagó
            </button>
            <button onClick={() => handleMarkStatus('perdido')} className="btn btn-danger" style={{ fontSize: 11, padding: '5px 12px' }}>
              ✗ Perdido
            </button>
          </div>
        )}

        <button
          onClick={() => { setEditMode(!editMode); if (editMode) setDraft(lead); }}
          className={`btn flex-shrink-0 ${editMode ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: 12 }}
        >
          {editMode ? 'Cancelar' : 'Editar'}
        </button>

        {editMode && (
          <button onClick={handleSaveEdit} disabled={saving} className="btn btn-success flex-shrink-0" style={{ fontSize: 12 }}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full flex flex-col gap-5">

        {/* ── KPIs rápidos ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card p-3.5">
            <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Precio plan</p>
            <p className="font-bold text-sm" style={{ color: '#4ade80' }}>
              {(lead.Precio_Plan ?? 0) > 0 ? formatCOP(lead.Precio_Plan!, true) : '—'}
            </p>
          </div>
          <div className="card p-3.5">
            <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Plan separe</p>
            <p className="font-bold text-sm" style={{ color: '#fbbf24' }}>
              {(lead.Plan_Separe ?? 0) > 0 ? formatCOP(lead.Plan_Separe!, true) : '—'}
            </p>
          </div>
          <div className="card p-3.5">
            <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Comprobante</p>
            <p className="font-bold text-sm" style={{ color: lead.Comprobante ? '#10b981' : '#f87171' }}>
              {lead.Comprobante ? '✓ Recibido' : '✗ Pendiente'}
            </p>
          </div>
          <div className="card p-3.5">
            <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Actividades</p>
            <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>{activities.length}</p>
          </div>
        </div>

        {/* ── Pipeline visual ── */}
        {stages.length > 0 && (
          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>Pipeline</p>
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {stages.map((stage, idx, arr) => {
                const isActive = stage.Id === lead.Stage_Id;
                const isPast   = currentStage ? (stage.Orden ?? idx) < (currentStage.Orden ?? 0) : false;
                const isLast   = idx === arr.length - 1;
                return (
                  <div key={stage.Id} className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => !isActive && patch({ Stage_Id: stage.Id, Stage_Nombre: stage.Nombre, Stage_Color: stage.Color } as Partial<CrmLead>).then(() => { toast.success(`Etapa → "${stage.Nombre}"`); fetchLead(); })}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all"
                      style={{
                        background: isActive ? stage.Color : isPast ? `${stage.Color}30` : 'var(--surface2)',
                        color:      isActive ? '#fff'       : isPast ? stage.Color         : 'var(--muted)',
                        border:     `1px solid ${isActive ? stage.Color : isPast ? `${stage.Color}40` : 'var(--border)'}`,
                        cursor:     isActive ? 'default' : 'pointer',
                        fontSize:   11,
                      }}
                    >
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white/70 flex-shrink-0" />}
                      {stage.Nombre}
                    </button>
                    {!isLast && <span style={{ color: 'var(--border2)', fontSize: 10 }}>›</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Dos columnas: Información + Actividades ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* ── Info del lead ── */}
          <div className="card p-5 flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
              Información del lead
            </p>

            {/* Teléfono */}
            <div className="rounded-xl p-3" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-bold mb-1.5" style={{ color: 'var(--muted)' }}>Teléfono WhatsApp</p>
              <div className="flex items-center gap-2">
                <input
                  type="tel"
                  defaultValue={lead.Telefono || ''}
                  onBlur={(e) => { if (e.target.value !== lead.Telefono) patch({ Telefono: e.target.value } as Partial<CrmLead>); }}
                  placeholder="+57 300 000 0000"
                  className="input-field flex-1"
                  style={{ fontSize: 14, fontWeight: 600 }}
                />
                {lead.Telefono && (
                  <a href={toWALink(lead.Telefono)} target="_blank" rel="noopener noreferrer"
                    className="btn flex-shrink-0"
                    style={{ background: '#25D36620', color: '#25D366', border: '1px solid #25D36640', textDecoration: 'none' }}>
                    WA
                  </a>
                )}
              </div>
            </div>

            {/* Campos editables */}
            {editMode ? (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--muted)' }}>Nombre</label>
                    <input type="text" value={draft.Nombre || ''} onChange={(e) => setDraft(d => ({ ...d, Nombre: e.target.value }))} className="input-field" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--muted)' }}>Ciudad</label>
                    <select value={draft.Ciudad || ''} onChange={(e) => setDraft(d => ({ ...d, Ciudad: e.target.value }))} className="input-field" style={selectStyle}>
                      <option value="">Seleccionar...</option>
                      {COLOMBIA_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--muted)' }}>Origen</label>
                    <select value={draft.Origen || 'Meta Ads'} onChange={(e) => setDraft(d => ({ ...d, Origen: e.target.value }))} className="input-field" style={selectStyle}>
                      {LEAD_ORIGINS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--muted)' }}>Asesor</label>
                    <select value={draft.Usuario_Nombre || 'Oscar'} onChange={(e) => setDraft(d => ({ ...d, Usuario_Nombre: e.target.value }))} className="input-field" style={selectStyle}>
                      {ASESORES.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--muted)' }}>Precio Plan (COP)</label>
                    <input type="number" value={draft.Precio_Plan || ''} onChange={(e) => setDraft(d => ({ ...d, Precio_Plan: Number(e.target.value) }))} className="input-field" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--muted)' }}>Plan Separe (COP)</label>
                    <input type="number" value={draft.Plan_Separe || ''} onChange={(e) => setDraft(d => ({ ...d, Plan_Separe: Number(e.target.value) }))} className="input-field" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--muted)' }}>Fecha de inicio</label>
                    <input type="date" value={draft.Fecha_Inicio || ''} onChange={(e) => setDraft(d => ({ ...d, Fecha_Inicio: e.target.value }))} className="input-field" style={{ colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--muted)' }}>Primer contacto</label>
                    <input type="date" value={draft.Dia_Primer_Contacto || ''} onChange={(e) => setDraft(d => ({ ...d, Dia_Primer_Contacto: e.target.value }))} className="input-field" style={{ colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--muted)' }}>Día del cierre</label>
                    <input type="date" value={draft.Dia_Cierre || ''} onChange={(e) => setDraft(d => ({ ...d, Dia_Cierre: e.target.value }))} className="input-field" style={{ colorScheme: 'dark' }} />
                  </div>
                  <div className="flex items-center gap-2 pt-4">
                    <input type="checkbox" id="comprobante-edit" checked={draft.Comprobante ?? false} onChange={(e) => setDraft(d => ({ ...d, Comprobante: e.target.checked }))} className="w-4 h-4 rounded" />
                    <label htmlFor="comprobante-edit" className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Comprobante recibido</label>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                {[
                  { label: 'Nombre',          value: lead.Nombre        },
                  { label: 'Ciudad',           value: lead.Ciudad        },
                  { label: 'Origen',           value: lead.Origen        },
                  { label: 'Asesor',           value: lead.Usuario_Nombre},
                  { label: 'Fecha inicio',     value: fmtDate(lead.Fecha_Inicio) },
                  { label: 'Primer contacto',  value: fmtDate(lead.Dia_Primer_Contacto) },
                  { label: 'Día del cierre',   value: fmtDate(lead.Dia_Cierre) },
                  { label: 'Fecha creación',   value: fmtDate(lead.Fecha_Creacion) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="font-semibold mb-0.5" style={{ color: 'var(--muted)' }}>{label}</p>
                    <p style={{ color: 'var(--text)' }}>{value || '—'}</p>
                  </div>
                ))}
              </div>
            )}

            {lead.Notas && (
              <div>
                <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--muted)' }}>Notas</p>
                <p className="text-xs leading-relaxed p-3 rounded-xl"
                  style={{ background: 'var(--surface2)', color: 'var(--text-soft)', whiteSpace: 'pre-wrap' }}>
                  {lead.Notas}
                </p>
              </div>
            )}

            {lead.Estado === 'perdido' && lead.Motivo_Perdida && (
              <div className="p-2.5 rounded-lg" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                <p className="text-xs font-semibold mb-0.5" style={{ color: '#f87171' }}>Motivo de pérdida</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>{lead.Motivo_Perdida}</p>
              </div>
            )}
          </div>

          {/* ── Actividades ── */}
          <div className="card p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Actividades ({activities.length})
              </p>
              <button onClick={() => setShowActModal(true)} className="btn btn-primary" style={{ fontSize: 11, padding: '5px 12px' }}>
                + Registrar
              </button>
            </div>

            {/* Iconos de tipo de actividad */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
              {Object.entries(ACTIVITY_ICONS).map(([tipo, icon]) => {
                const count = activities.filter(a => a.Tipo === tipo).length;
                return (
                  <div key={tipo} className="flex items-center gap-1 flex-1 justify-center">
                    <span className="text-lg" style={{ opacity: count > 0 ? 1 : 0.25 }}>{icon}</span>
                    {count > 0 && (
                      <span className="text-xs font-bold" style={{ color: 'var(--muted)' }}>{count}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {activities.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 gap-3">
                <p className="text-sm" style={{ color: 'var(--muted)' }}>Sin actividades registradas</p>
                <button onClick={() => setShowActModal(true)} className="btn btn-ghost" style={{ fontSize: 12 }}>
                  Registrar primera actividad
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 overflow-y-auto" style={{ maxHeight: 450 }}>
                {activities.map((act, idx) => (
                  <div key={act.Id} className="relative flex gap-3">
                    {idx < activities.length - 1 && (
                      <div className="absolute left-4 top-8 bottom-0 w-px" style={{ background: 'var(--border)' }} />
                    )}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-base z-10"
                      style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                      {ACTIVITY_ICONS[act.Tipo] ?? '📋'}
                    </div>
                    <div className="flex-1 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>{act.Tipo}</p>
                          <p className="text-xs" style={{ color: 'var(--muted)' }}>{act.Resultado}</p>
                        </div>
                        <span className="text-xs flex-shrink-0" style={{ color: 'var(--muted2)' }}>
                          {fmtDateTime(act.Fecha)}
                        </span>
                      </div>
                      {act.Nota && (
                        <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--text-soft)' }}>{act.Nota}</p>
                      )}
                      {act.Proxima_Accion_Fecha && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#fbbf24" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          <p className="text-xs font-medium" style={{ color: '#fbbf24' }}>
                            {fmtDate(act.Proxima_Accion_Fecha)}
                            {act.Proxima_Accion_Nota && ` — ${act.Proxima_Accion_Nota}`}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ActivityModal
        isOpen={showActModal}
        onClose={() => setShowActModal(false)}
        leadId={lead.Id}
        leadName={lead.Nombre}
        onSaved={() => { fetchActivities(); }}
      />
    </div>
  );
}
