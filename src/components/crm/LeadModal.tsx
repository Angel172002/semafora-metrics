'use client';

import { useEffect, useState, useCallback } from 'react';
import type { CrmLead, CrmActivity, CrmStage, CrmUser } from '@/types';
import { formatCOP } from '@/lib/format';
import ActivityModal from './ActivityModal';
import { useToast } from '@/components/Toast';
import { ASESORES, LEAD_ORIGINS, ACTIVITY_ICONS, COLOMBIA_CITIES, ORIGIN_COLOR } from '@/lib/crmConstants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lead: CrmLead | null;
  stages: CrmStage[];
  users?: CrmUser[]; // kept for API compat, asesores now hardcoded
  mode: 'view' | 'create';
  defaultStageId?: number;
  onSaved: () => void;
}

function getInitials(name: string): string {
  const p = name.trim().split(' ').filter(Boolean);
  if (p.length === 0) return '?';
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[1][0]).toUpperCase();
}
function getAvatarColor(name: string): string {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#3b82f6', '#14b8a6', '#f59e0b', '#10b981'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}
function toWALink(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  return `https://wa.me/${clean.startsWith('57') ? clean : `57${clean}`}`;
}

type FormState = {
  Nombre: string;
  Telefono: string;
  Origen: string;
  Ciudad: string;
  Asesor: string;
  Stage_Id: string;
  Fecha_Inicio: string;
  Dia_Primer_Contacto: string;
  Dia_Cierre: string;
  Precio_Plan: string;
  Plan_Separe: string;
  Comprobante: boolean;
  Notas: string;
  Estado: string;
  Motivo_Perdida: string;
};

const defaultForm = (stageId?: number): FormState => ({
  Nombre: '', Telefono: '', Origen: 'Meta Ads', Ciudad: '',
  Asesor: 'Oscar', Stage_Id: String(stageId || 1),
  Fecha_Inicio: '', Dia_Primer_Contacto: '', Dia_Cierre: '',
  Precio_Plan: '', Plan_Separe: '', Comprobante: false,
  Notas: '', Estado: 'abierto', Motivo_Perdida: '',
});

export default function LeadModal({ isOpen, onClose, lead, stages, mode, defaultStageId, onSaved }: Props) {
  const [tab, setTab] = useState<'info' | 'economico' | 'activities' | 'notas'>('info');
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [loadingActs, setLoadingActs] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormState>(defaultForm(defaultStageId));
  const toast = useToast();

  // Poblar form al abrir
  useEffect(() => {
    if (lead) {
      setForm({
        Nombre:              lead.Nombre               || '',
        Telefono:            lead.Telefono              || '',
        Origen:              lead.Origen               || 'Meta Ads',
        Ciudad:              lead.Ciudad               || '',
        Asesor:              lead.Usuario_Nombre        || 'Oscar',
        Stage_Id:            String(lead.Stage_Id      || 1),
        Fecha_Inicio:        lead.Fecha_Inicio         || '',
        Dia_Primer_Contacto: lead.Dia_Primer_Contacto  || '',
        Dia_Cierre:          lead.Dia_Cierre           || '',
        Precio_Plan:         String(lead.Precio_Plan   || ''),
        Plan_Separe:         String(lead.Plan_Separe   || ''),
        Comprobante:         lead.Comprobante          ?? false,
        Notas:               lead.Notas                || '',
        Estado:              lead.Estado               || 'abierto',
        Motivo_Perdida:      lead.Motivo_Perdida       || '',
      });
    } else {
      setForm(defaultForm(defaultStageId));
    }
  }, [lead, defaultStageId]);

  useEffect(() => { if (!isOpen) { setTab('info'); setError(''); } }, [isOpen]);

  const fetchActivities = useCallback(async () => {
    if (!lead) return;
    setLoadingActs(true);
    try {
      const res = await fetch(`/api/crm/activities?leadId=${lead.Id}`);
      const json = await res.json();
      if (json.success) setActivities(json.data || []);
    } catch { /* silent */ }
    finally { setLoadingActs(false); }
  }, [lead]);

  useEffect(() => {
    if (isOpen && tab === 'activities' && lead) fetchActivities();
  }, [isOpen, tab, lead, fetchActivities]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.Nombre.trim()) { setError('El nombre es obligatorio'); return; }
    if (form.Telefono.trim()) {
      const digits = form.Telefono.replace(/\D/g, '');
      if (digits.length < 7) { setError('Teléfono inválido (mínimo 7 dígitos)'); return; }
    }
    setSaving(true); setError('');
    try {
      const selectedStage = stages.find((s) => s.Id === Number(form.Stage_Id));
      const payload = {
        Nombre:              form.Nombre,
        Telefono:            form.Telefono,
        Origen:              form.Origen,
        Ciudad:              form.Ciudad,
        Usuario_Nombre:      form.Asesor,
        Usuario_Id:          ASESORES.indexOf(form.Asesor as typeof ASESORES[number]) + 1 || 1,
        Stage_Id:            Number(form.Stage_Id),
        Stage_Nombre:        selectedStage?.Nombre || '',
        Stage_Color:         selectedStage?.Color  || '#6366f1',
        Fecha_Inicio:        form.Fecha_Inicio        || null,
        Dia_Primer_Contacto: form.Dia_Primer_Contacto || null,
        Dia_Cierre:          form.Dia_Cierre          || null,
        Precio_Plan:         parseFloat(form.Precio_Plan)  || 0,
        Plan_Separe:         parseFloat(form.Plan_Separe)  || 0,
        Comprobante:         form.Comprobante,
        Valor_Estimado:      parseFloat(form.Precio_Plan)  || 0,
        Notas:               form.Notas,
        Estado:              form.Estado,
        Motivo_Perdida:      form.Motivo_Perdida,
      };
      const url    = lead ? `/api/crm/leads/${lead.Id}` : '/api/crm/leads';
      const method = lead ? 'PATCH' : 'POST';
      const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Error al guardar');
      toast.success(lead ? 'Lead actualizado' : 'Lead creado correctamente');
      onSaved(); onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toast.error(`Error: ${msg}`);
    } finally { setSaving(false); }
  };

  const handleChangeStage = async (stageId: number) => {
    if (!lead) return;
    const stage = stages.find((s) => s.Id === stageId);
    if (!stage) return;
    try {
      const res = await fetch(`/api/crm/leads/${lead.Id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Stage_Id: stageId, Stage_Nombre: stage.Nombre, Stage_Color: stage.Color }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Error al cambiar etapa');
      setForm((f) => ({ ...f, Stage_Id: String(stageId) }));
      toast.success(`Etapa → "${stage.Nombre}"`);
      onSaved();
    } catch (e) {
      toast.error(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleMarkStatus = async (status: 'ganado' | 'perdido') => {
    if (!lead) return;
    const stage = status === 'ganado' ? stages.find((s) => s.Es_Ganado) : stages.find((s) => s.Es_Perdido);
    try {
      await fetch(`/api/crm/leads/${lead.Id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Estado:       status,
          Stage_Id:     stage?.Id,
          Stage_Nombre: stage?.Nombre || (status === 'ganado' ? 'Cliente Pagó' : 'Negocio Perdido'),
          Stage_Color:  stage?.Color  || (status === 'ganado' ? '#10b981' : '#ef4444'),
        }),
      });
      toast.success(status === 'ganado' ? 'Lead marcado como Cliente Pagó' : 'Lead marcado como Negocio Perdido');
      onSaved(); onClose();
    } catch (e) {
      toast.error(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  if (!isOpen) return null;

  const avatarColor = getAvatarColor(form.Nombre || 'Lead');
  const originColor = ORIGIN_COLOR[form.Origen] ?? '#6b7280';

  // Helpers de render
  const field = (label: string, children: React.ReactNode, required = false) => (
    <div>
      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--muted)' }}>
        {label}{required && <span style={{ color: 'var(--primary)' }}> *</span>}
      </label>
      {children}
    </div>
  );

  const inp = (k: keyof FormState, placeholder = '', type = 'text') => (
    <input type={type} value={form[k] as string} onChange={set(k)} placeholder={placeholder} className="input-field" />
  );

  const selectStyle = {
    paddingRight: 32, appearance: 'none' as const,
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238888a0' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat' as const, backgroundPosition: 'right 10px center' as const,
  };

  return (
    <>
      <div className="side-panel-overlay" onClick={onClose} />
      <div className="side-panel">

        {/* ── Header ── */}
        <div className="px-6 py-4 border-b flex items-start gap-3" style={{ borderColor: 'var(--border)' }}>
          <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white text-sm"
            style={{ background: `${avatarColor}cc` }}>
            {getInitials(form.Nombre || 'Lead')}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold truncate" style={{ color: 'var(--text)' }}>
              {mode === 'create' ? 'Nuevo Lead' : (form.Nombre || 'Lead')}
            </h2>
            {lead && (
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--surface3)', color: 'var(--muted)' }}>
                  #SEM-{String(lead.Id).padStart(3, '0')}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: `${originColor}18`, color: originColor }}>
                  {lead.Origen}
                </span>
                {lead.Comprobante && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                    ✓ Comprobante
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {lead && lead.Estado === 'abierto' && (
              <>
                <button onClick={() => handleMarkStatus('ganado')} className="btn btn-success" style={{ fontSize: 11, padding: '5px 10px' }}>
                  ✓ Pagó
                </button>
                <button onClick={() => handleMarkStatus('perdido')} className="btn btn-danger" style={{ fontSize: 11, padding: '5px 10px' }}>
                  ✗ Perdido
                </button>
              </>
            )}
            <button onClick={onClose} className="btn btn-ghost btn-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="tab-bar px-2">
          {(['info', 'economico', 'activities', 'notas'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`tab-item ${tab === t ? 'active' : ''}`}>
              {t === 'info' ? 'Contacto' : t === 'economico' ? 'Económico' : t === 'activities' ? 'Actividades' : 'Notas'}
            </button>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ──── TAB: CONTACTO ──── */}
          {tab === 'info' && (
            <div className="flex flex-col gap-4">

              {/* Teléfono destacado */}
              <div className="rounded-xl p-3.5" style={{ background: 'var(--surface2)', border: '1.5px solid var(--border)' }}>
                <label className="block text-xs font-bold mb-2" style={{ color: 'var(--muted)' }}>
                  📱 Teléfono WhatsApp
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={form.Telefono}
                    onChange={set('Telefono')}
                    placeholder="+57 300 000 0000"
                    className="input-field flex-1"
                    style={{ fontSize: 15, fontWeight: 600 }}
                  />
                  {form.Telefono && (
                    <a
                      href={toWALink(form.Telefono)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn flex-shrink-0"
                      style={{ background: '#25D36620', color: '#25D366', border: '1px solid #25D36640', textDecoration: 'none' }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 0C5.373 0 0 5.373 0 12c0 2.124.557 4.118 1.527 5.845L0 24l6.336-1.502A11.938 11.938 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.89 0-3.663-.5-5.19-1.373l-.373-.217-3.863.916.952-3.773-.237-.388A9.953 9.953 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                      </svg>
                      WA
                    </a>
                  )}
                </div>
              </div>

              {/* Nombre + Ciudad */}
              <div className="grid grid-cols-2 gap-3">
                {field('Nombre completo', inp('Nombre', 'Juan García'), true)}
                {field('Ciudad', (
                  <select value={form.Ciudad} onChange={set('Ciudad')} className="input-field" style={selectStyle}>
                    <option value="">Seleccionar ciudad...</option>
                    {COLOMBIA_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                ))}
              </div>

              {/* Origen + Asesor */}
              <div className="grid grid-cols-2 gap-3">
                {field('Origen', (
                  <select value={form.Origen} onChange={set('Origen')} className="input-field" style={selectStyle}>
                    {LEAD_ORIGINS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ))}
                {field('Asesor', (
                  <select value={form.Asesor} onChange={set('Asesor')} className="input-field" style={selectStyle}>
                    {ASESORES.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                ))}
              </div>

              {/* Etapa */}
              {field('Etapa del pipeline', (
                <select
                  value={form.Stage_Id}
                  onChange={(e) => {
                    const newId = Number(e.target.value);
                    setForm((f) => ({ ...f, Stage_Id: e.target.value }));
                    if (lead) handleChangeStage(newId);
                  }}
                  className="input-field"
                  style={selectStyle}
                >
                  {stages.map((s) => <option key={s.Id} value={s.Id}>{s.Nombre}</option>)}
                </select>
              ))}

              {/* Fechas */}
              <div className="grid grid-cols-3 gap-3">
                {field('Fecha de inicio', inp('Fecha_Inicio', '', 'date'))}
                {field('Primer contacto', inp('Dia_Primer_Contacto', '', 'date'))}
                {field('Día del cierre', inp('Dia_Cierre', '', 'date'))}
              </div>

              {/* Motivo pérdida */}
              {form.Estado === 'perdido' && (
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#f87171' }}>
                    Motivo de pérdida
                  </label>
                  <input
                    type="text"
                    value={form.Motivo_Perdida}
                    onChange={set('Motivo_Perdida')}
                    placeholder="Precio, timing, competencia..."
                    className="input-field"
                  />
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl text-xs flex items-center gap-2"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ──── TAB: ECONÓMICO ──── */}
          {tab === 'economico' && (
            <div className="flex flex-col gap-4">

              {/* Precio Plan */}
              <div className="rounded-xl p-4" style={{ background: 'var(--surface2)', border: '1.5px solid var(--border)' }}>
                <label className="block text-xs font-bold mb-2" style={{ color: 'var(--muted)' }}>
                  💰 Precio del Plan (COP)
                </label>
                <input
                  type="number"
                  value={form.Precio_Plan}
                  onChange={set('Precio_Plan')}
                  placeholder="2400000"
                  className="input-field"
                  style={{ fontSize: 20, fontWeight: 700, color: '#4ade80' }}
                />
                {form.Precio_Plan && Number(form.Precio_Plan) > 0 && (
                  <p className="text-xs mt-1.5 font-semibold" style={{ color: '#4ade80' }}>
                    {formatCOP(Number(form.Precio_Plan), false)}
                  </p>
                )}
              </div>

              {/* Plan Separe */}
              <div className="rounded-xl p-4" style={{ background: 'var(--surface2)', border: '1.5px solid var(--border)' }}>
                <label className="block text-xs font-bold mb-2" style={{ color: 'var(--muted)' }}>
                  📌 Plan Separe (COP)
                </label>
                <input
                  type="number"
                  value={form.Plan_Separe}
                  onChange={set('Plan_Separe')}
                  placeholder="500000"
                  className="input-field"
                  style={{ fontSize: 20, fontWeight: 700, color: '#fbbf24' }}
                />
                {form.Plan_Separe && Number(form.Plan_Separe) > 0 && (
                  <p className="text-xs mt-1.5 font-semibold" style={{ color: '#fbbf24' }}>
                    {formatCOP(Number(form.Plan_Separe), false)}
                  </p>
                )}
              </div>

              {/* Comprobante */}
              <div
                className="flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all"
                style={{
                  background: form.Comprobante ? 'rgba(16,185,129,0.08)' : 'var(--surface2)',
                  border: `1.5px solid ${form.Comprobante ? 'rgba(16,185,129,0.35)' : 'var(--border)'}`,
                }}
                onClick={() => setForm((f) => ({ ...f, Comprobante: !f.Comprobante }))}
              >
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>Comprobante de pago</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                    {form.Comprobante ? 'Comprobante recibido y verificado' : 'Pendiente de recibir comprobante'}
                  </p>
                </div>
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    background: form.Comprobante ? '#10b981' : 'var(--surface3)',
                    border: `2px solid ${form.Comprobante ? '#10b981' : 'var(--border2)'}`,
                  }}
                >
                  {form.Comprobante && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Resumen si hay valores */}
              {(Number(form.Precio_Plan) > 0 || Number(form.Plan_Separe) > 0) && (
                <div className="rounded-xl p-3.5" style={{ background: 'var(--surface3)', border: '1px solid var(--border)' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>Resumen económico</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>Precio plan</span>
                    <span className="text-sm font-bold" style={{ color: '#4ade80' }}>
                      {Number(form.Precio_Plan) > 0 ? formatCOP(Number(form.Precio_Plan), true) : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>Plan separe</span>
                    <span className="text-sm font-bold" style={{ color: '#fbbf24' }}>
                      {Number(form.Plan_Separe) > 0 ? formatCOP(Number(form.Plan_Separe), true) : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>Comprobante</span>
                    <span className="text-xs font-bold" style={{ color: form.Comprobante ? '#10b981' : '#f87171' }}>
                      {form.Comprobante ? '✓ Recibido' : '✗ Pendiente'}
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ──── TAB: ACTIVIDADES ──── */}
          {tab === 'activities' && (
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setShowActivityModal(true)}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                style={{ border: '1.5px dashed var(--border2)', color: 'var(--muted)', background: 'transparent', cursor: 'pointer' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--accent)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--muted)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border2)'; }}
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Registrar actividad
              </button>

              {loadingActs ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="skeleton h-16 rounded-xl" />
                ))
              ) : activities.length === 0 ? (
                <div className="text-center py-10 text-sm" style={{ color: 'var(--muted)' }}>
                  Sin actividades registradas
                </div>
              ) : (
                activities.map((act) => (
                  <div key={act.Id} className="card-flat rounded-xl p-3.5">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg leading-none">{ACTIVITY_ICONS[act.Tipo] ?? '📋'}</span>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{act.Tipo}</p>
                          <p className="text-xs" style={{ color: 'var(--muted)' }}>{act.Resultado}</p>
                        </div>
                      </div>
                      <span className="text-xs flex-shrink-0" style={{ color: 'var(--muted2)' }}>
                        {new Date(act.Fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                    {act.Nota && (
                      <p className="text-xs leading-relaxed pl-9" style={{ color: 'var(--text-soft)' }}>{act.Nota}</p>
                    )}
                    {act.Proxima_Accion_Fecha && (
                      <div className="flex items-center gap-1.5 mt-2 pl-9">
                        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="#fbbf24" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <p className="text-xs font-medium" style={{ color: '#fbbf24' }}>
                          {new Date(act.Proxima_Accion_Fecha).toLocaleDateString('es-CO')}
                          {act.Proxima_Accion_Nota && ` — ${act.Proxima_Accion_Nota}`}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ──── TAB: NOTAS ──── */}
          {tab === 'notas' && (
            <textarea
              value={form.Notas}
              onChange={set('Notas')}
              rows={14}
              placeholder="Notas sobre este lead, contexto, observaciones..."
              className="input-field"
              style={{ resize: 'none', borderRadius: 12, padding: 14, lineHeight: 1.7 }}
            />
          )}

        </div>

        {/* ── Footer ── */}
        {tab !== 'activities' && (
          <div className="px-6 py-4 border-t flex items-center justify-end gap-3" style={{ borderColor: 'var(--border)' }}>
            <button onClick={onClose} className="btn btn-ghost">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary">
              {saving ? (
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="animate-spin">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : null}
              {saving ? 'Guardando...' : lead ? 'Guardar cambios' : 'Crear lead'}
            </button>
          </div>
        )}
      </div>

      {lead && (
        <ActivityModal
          isOpen={showActivityModal}
          onClose={() => setShowActivityModal(false)}
          leadId={lead.Id}
          leadName={lead.Nombre}
          onSaved={() => { fetchActivities(); onSaved(); }}
        />
      )}
    </>
  );
}
