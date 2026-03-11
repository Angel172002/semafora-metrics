'use client';

import { useEffect, useState, useCallback } from 'react';
import type { CrmLead, CrmActivity, CrmStage, CrmUser } from '@/types';
import { formatCOP } from '@/lib/format';
import ActivityModal from './ActivityModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lead: CrmLead | null;
  stages: CrmStage[];
  users: CrmUser[];
  mode: 'view' | 'create';
  defaultStageId?: number;
  onSaved: () => void;
}

const ORIGINS = ['Meta Ads', 'Google Ads', 'TikTok Ads', 'Orgánico', 'Referido', 'WhatsApp', 'Otro'] as const;

const ACTIVITY_ICONS: Record<string, string> = {
  Llamada: '📞', WhatsApp: '💬', Email: '📧', Reunión: '🤝', Nota: '📝',
};

function getInitials(name: string): string {
  const p = name.trim().split(' ').filter(Boolean);
  if (p.length === 0) return '?';
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[1][0]).toUpperCase();
}
function getAvatarColor(name: string): string {
  const colors = ['#6366f1','#8b5cf6','#ec4899','#3b82f6','#14b8a6','#f59e0b','#10b981'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

export default function LeadModal({ isOpen, onClose, lead, stages, users, mode, defaultStageId, onSaved }: Props) {
  const [tab, setTab] = useState<'info' | 'activities' | 'notes'>('info');
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [loadingActs, setLoadingActs] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    Nombre: '', Telefono: '', Email: '', Empresa: '',
    Origen: 'Meta Ads' as string,
    Nombre_Campana: '', ID_Campana: '', Plataforma_Origen: '',
    Valor_Estimado: '', Stage_Id: String(defaultStageId || 1),
    Usuario_Id: '1', Notas: '',
    Proxima_Accion_Fecha: '', Estado: 'abierto' as string,
    Motivo_Perdida: '',
  });

  useEffect(() => {
    if (lead) {
      setForm({
        Nombre:               lead.Nombre            || '',
        Telefono:             lead.Telefono           || '',
        Email:                lead.Email             || '',
        Empresa:              lead.Empresa            || '',
        Origen:               lead.Origen            || 'Meta Ads',
        Nombre_Campana:       lead.Nombre_Campana    || '',
        ID_Campana:           lead.ID_Campana        || '',
        Plataforma_Origen:    lead.Plataforma_Origen || '',
        Valor_Estimado:       String(lead.Valor_Estimado || ''),
        Stage_Id:             String(lead.Stage_Id   || 1),
        Usuario_Id:           String(lead.Usuario_Id || 1),
        Notas:                lead.Notas             || '',
        Proxima_Accion_Fecha: lead.Proxima_Accion_Fecha || '',
        Estado:               lead.Estado            || 'abierto',
        Motivo_Perdida:       lead.Motivo_Perdida    || '',
      });
    } else {
      setForm((f) => ({ ...f, Stage_Id: String(defaultStageId || 1) }));
    }
  }, [lead, defaultStageId]);

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

  useEffect(() => { if (isOpen && tab === 'activities' && lead) fetchActivities(); }, [isOpen, tab, lead, fetchActivities]);
  useEffect(() => { if (!isOpen) { setTab('info'); setError(''); } }, [isOpen]);

  const handleSave = async () => {
    if (!form.Nombre.trim()) { setError('El nombre es obligatorio'); return; }
    setSaving(true); setError('');
    try {
      const selectedStage = stages.find((s) => s.Id === Number(form.Stage_Id));
      const selectedUser  = users.find((u)  => u.Id === Number(form.Usuario_Id));
      const payload = {
        ...form,
        Valor_Estimado: parseFloat(form.Valor_Estimado) || 0,
        Stage_Id:       Number(form.Stage_Id),
        Stage_Nombre:   selectedStage?.Nombre || '',
        Stage_Color:    selectedStage?.Color  || '#6366f1',
        Usuario_Id:     Number(form.Usuario_Id),
        Usuario_Nombre: selectedUser?.Nombre  || 'Administrador',
      };
      const url    = lead ? `/api/crm/leads/${lead.Id}` : '/api/crm/leads';
      const method = lead ? 'PATCH' : 'POST';
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json   = await res.json();
      if (!json.success) throw new Error(json.error || 'Error al guardar');
      onSaved(); onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setSaving(false); }
  };

  const handleChangeStage = async (stageId: number) => {
    if (!lead) return;
    const stage = stages.find((s) => s.Id === stageId);
    if (!stage) return;
    try {
      await fetch(`/api/crm/leads/${lead.Id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Stage_Id: stageId, Stage_Nombre: stage.Nombre, Stage_Color: stage.Color }),
      });
      setForm((f) => ({ ...f, Stage_Id: String(stageId) }));
      onSaved();
    } catch { /* silent */ }
  };

  const handleMarkStatus = async (status: 'ganado' | 'perdido') => {
    if (!lead) return;
    const stage = status === 'ganado' ? stages.find((s) => s.Es_Ganado) : stages.find((s) => s.Es_Perdido);
    try {
      await fetch(`/api/crm/leads/${lead.Id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Estado: status,
          Stage_Id:     stage?.Id,
          Stage_Nombre: stage?.Nombre || (status === 'ganado' ? 'Ganado'  : 'Perdido'),
          Stage_Color:  stage?.Color  || (status === 'ganado' ? '#10b981' : '#ef4444'),
          Fecha_Cierre: new Date().toISOString(),
        }),
      });
      onSaved(); onClose();
    } catch { /* silent */ }
  };

  if (!isOpen) return null;

  const avatarName  = form.Nombre || 'Lead';
  const avatarColor = getAvatarColor(avatarName);

  const field = (label: string, children: React.ReactNode, required = false) => (
    <div>
      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--muted)' }}>
        {label}{required && <span style={{ color: 'var(--primary)' }}> *</span>}
      </label>
      {children}
    </div>
  );

  const inp = (name: keyof typeof form, placeholder = '', type = 'text') => (
    <input
      type={type}
      value={form[name]}
      onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
      placeholder={placeholder}
      className="input-field"
    />
  );

  const sel = (name: keyof typeof form, children: React.ReactNode) => (
    <select
      value={form[name]}
      onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
      className="input-field"
      style={{ paddingRight: 32, appearance: 'none',
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238888a0' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
    >
      {children}
    </select>
  );

  return (
    <>
      {/* Backdrop */}
      <div className="side-panel-overlay" onClick={onClose} />

      {/* Panel */}
      <div className="side-panel">

        {/* Header */}
        <div className="px-6 py-4 border-b flex items-start gap-3" style={{ borderColor: 'var(--border)' }}>
          {/* Avatar */}
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white text-sm"
            style={{ background: `${avatarColor}cc` }}
          >
            {getInitials(avatarName)}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold truncate" style={{ color: 'var(--text)' }}>
              {mode === 'create' ? 'Nuevo Lead' : (form.Nombre || 'Lead')}
            </h2>
            {lead && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                Creado {new Date(lead.Fecha_Creacion).toLocaleDateString('es-CO')}
                {lead.Valor_Estimado > 0 && <span style={{ color: '#4ade80' }}> · {formatCOP(lead.Valor_Estimado, true)}</span>}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {lead && lead.Estado === 'abierto' && (
              <>
                <button onClick={() => handleMarkStatus('ganado')} className="btn btn-success" style={{ fontSize: 11, padding: '5px 10px' }}>
                  ✓ Ganado
                </button>
                <button onClick={() => handleMarkStatus('perdido')} className="btn btn-danger" style={{ fontSize: 11, padding: '5px 10px' }}>
                  ✗ Perdido
                </button>
              </>
            )}
            <button onClick={onClose} className="btn btn-ghost btn-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="tab-bar px-2">
          {(['info', 'activities', 'notes'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`tab-item ${tab === t ? 'active' : ''}`}
            >
              {t === 'info' ? 'Información' : t === 'activities' ? 'Actividades' : 'Notas'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── INFO ── */}
          {tab === 'info' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                {field('Nombre', inp('Nombre', 'Juan García'), true)}
                {field('Teléfono', inp('Telefono', '+57 300 000 0000', 'tel'))}
                {field('Email', inp('Email', 'juan@empresa.com', 'email'))}
                {field('Empresa', inp('Empresa', 'Empresa S.A.S.'))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {field('Origen', sel('Origen', ORIGINS.map((o) => <option key={o} value={o}>{o}</option>)))}
                {field('Campaña de origen', inp('Nombre_Campana', 'Clientes Enero 2026'))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {field('Etapa', sel('Stage_Id',
                  stages.map((s) => (
                    <option key={s.Id} value={s.Id} onClick={() => lead && handleChangeStage(s.Id)}>
                      {s.Nombre}
                    </option>
                  ))
                ))}
                {field('Asesor', sel('Usuario_Id',
                  users.map((u) => <option key={u.Id} value={u.Id}>{u.Nombre}</option>)
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {field('Valor Estimado (COP)', inp('Valor_Estimado', '5000000', 'number'))}
                {field('Próxima acción', inp('Proxima_Accion_Fecha', '', 'date'))}
              </div>

              {form.Estado !== 'abierto' && (
                <div className="grid grid-cols-2 gap-3">
                  {field('Estado', (
                    <div className={`px-3 py-2 rounded-lg text-sm font-semibold`}
                      style={form.Estado === 'ganado'
                        ? { background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }
                        : { background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>
                      {form.Estado === 'ganado' ? '✓ Ganado' : '✗ Perdido'}
                    </div>
                  ))}
                  {form.Estado === 'perdido' && field('Motivo pérdida', inp('Motivo_Perdida', 'Precio, timing...'))}
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl text-xs flex items-center gap-2"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ── ACTIVITIES ── */}
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
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
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
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg leading-none">{ACTIVITY_ICONS[act.Tipo] ?? '📝'}</span>
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
                          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>
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

          {/* ── NOTES ── */}
          {tab === 'notes' && (
            <textarea
              value={form.Notas}
              onChange={(e) => setForm((f) => ({ ...f, Notas: e.target.value }))}
              rows={14}
              placeholder="Notas sobre este lead, contexto, observaciones..."
              className="input-field"
              style={{ resize: 'none', borderRadius: 12, padding: 14, lineHeight: 1.7 }}
            />
          )}
        </div>

        {/* Footer */}
        {(tab === 'info' || tab === 'notes') && (
          <div className="px-6 py-4 border-t flex items-center justify-end gap-3" style={{ borderColor: 'var(--border)' }}>
            <button onClick={onClose} className="btn btn-ghost">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary"
            >
              {saving ? (
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="animate-spin">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
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
