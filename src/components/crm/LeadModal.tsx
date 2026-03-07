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

export default function LeadModal({ isOpen, onClose, lead, stages, users, mode, defaultStageId, onSaved }: Props) {
  const [tab, setTab] = useState<'info' | 'activities' | 'notes'>('info');
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [loadingActs, setLoadingActs] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [form, setForm] = useState({
    Nombre: '', Telefono: '', Email: '', Empresa: '',
    Origen: 'Meta Ads' as string,
    Nombre_Campana: '', ID_Campana: '', Plataforma_Origen: '',
    Valor_Estimado: '', Stage_Id: String(defaultStageId || 1),
    Usuario_Id: '1', Notas: '',
    Proxima_Accion_Fecha: '', Estado: 'abierto' as string,
    Motivo_Perdida: '',
  });

  // Sync form with lead data
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

  useEffect(() => {
    if (isOpen && tab === 'activities' && lead) fetchActivities();
  }, [isOpen, tab, lead, fetchActivities]);

  useEffect(() => {
    if (!isOpen) { setTab('info'); setError(''); }
  }, [isOpen]);

  const handleSave = async () => {
    if (!form.Nombre.trim()) { setError('El nombre es obligatorio'); return; }
    setSaving(true); setError('');
    try {
      const selectedStage = stages.find((s) => s.Id === Number(form.Stage_Id));
      const selectedUser  = users.find((u) => u.Id === Number(form.Usuario_Id));
      const payload = {
        ...form,
        Valor_Estimado:    parseFloat(form.Valor_Estimado) || 0,
        Stage_Id:          Number(form.Stage_Id),
        Stage_Nombre:      selectedStage?.Nombre || '',
        Stage_Color:       selectedStage?.Color  || '#3b82f6',
        Usuario_Id:        Number(form.Usuario_Id),
        Usuario_Nombre:    selectedUser?.Nombre  || 'Administrador',
      };

      const url = lead ? `/api/crm/leads/${lead.Id}` : '/api/crm/leads';
      const method = lead ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
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
          Stage_Id: stage?.Id,
          Stage_Nombre: stage?.Nombre || (status === 'ganado' ? 'Ganado' : 'Perdido'),
          Stage_Color: stage?.Color || (status === 'ganado' ? '#10b981' : '#ef4444'),
          Fecha_Cierre: new Date().toISOString(),
        }),
      });
      onSaved(); onClose();
    } catch { /* silent */ }
  };

  if (!isOpen) return null;

  const field = (label: string, children: React.ReactNode, required = false) => (
    <div>
      <label className="block text-xs font-medium text-[var(--muted)] mb-1">
        {label}{required && <span className="text-[var(--primary)] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );

  const input = (name: keyof typeof form, placeholder = '', type = 'text') => (
    <input
      type={type}
      value={form[name]}
      onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
      placeholder={placeholder}
      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--primary)]/60"
    />
  );

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-start justify-end">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />

        {/* Side panel */}
        <div className="relative z-10 w-full max-w-xl h-screen bg-[var(--surface)] border-l border-[var(--border)] flex flex-col overflow-hidden animate-slide-in">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] flex-shrink-0">
            <div>
              <h2 className="text-base font-semibold text-[var(--text)]">
                {mode === 'create' ? 'Nuevo Lead' : (form.Nombre || 'Lead')}
              </h2>
              {lead && (
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Creado {new Date(lead.Fecha_Creacion).toLocaleDateString('es-CO')}
                  {lead.Valor_Estimado > 0 && ` · ${formatCOP(lead.Valor_Estimado, true)}`}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {lead && lead.Estado === 'abierto' && (
                <>
                  <button
                    onClick={() => handleMarkStatus('ganado')}
                    className="text-xs px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/20 transition-colors"
                  >✓ Ganado</button>
                  <button
                    onClick={() => handleMarkStatus('perdido')}
                    className="text-xs px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-colors"
                  >✗ Perdido</button>
                </>
              )}
              <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--text)] transition-colors p-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[var(--border)] px-6 flex-shrink-0">
            {(['info', 'activities', 'notes'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`py-3 px-1 mr-6 text-sm font-medium border-b-2 transition-colors ${
                  tab === t
                    ? 'border-[var(--primary)] text-[var(--text)]'
                    : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {t === 'info' ? 'Información' : t === 'activities' ? 'Actividades' : 'Notas'}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4">

            {/* ── INFO TAB ── */}
            {tab === 'info' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {field('Nombre', input('Nombre', 'Juan García'), true)}
                  {field('Teléfono', input('Telefono', '+57 300 000 0000', 'tel'))}
                  {field('Email', input('Email', 'juan@empresa.com', 'email'))}
                  {field('Empresa', input('Empresa', 'Empresa S.A.S.'))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {field('Origen', (
                    <select
                      value={form.Origen}
                      onChange={(e) => setForm((f) => ({ ...f, Origen: e.target.value }))}
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--primary)]/60"
                    >
                      {ORIGINS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ))}
                  {field('Campaña de origen', input('Nombre_Campana', 'Clientes Enero 2026'))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {field('Etapa', (
                    <select
                      value={form.Stage_Id}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, Stage_Id: e.target.value }));
                        if (lead) handleChangeStage(Number(e.target.value));
                      }}
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--primary)]/60"
                    >
                      {stages.map((s) => <option key={s.Id} value={s.Id}>{s.Nombre}</option>)}
                    </select>
                  ))}
                  {field('Asesor', (
                    <select
                      value={form.Usuario_Id}
                      onChange={(e) => setForm((f) => ({ ...f, Usuario_Id: e.target.value }))}
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--primary)]/60"
                    >
                      {users.map((u) => <option key={u.Id} value={u.Id}>{u.Nombre}</option>)}
                    </select>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {field('Valor Estimado (COP)', input('Valor_Estimado', '5000000', 'number'))}
                  {field('Próxima acción', input('Proxima_Accion_Fecha', '', 'date'))}
                </div>

                {form.Estado !== 'abierto' && (
                  <div className="grid grid-cols-2 gap-3">
                    {field('Estado', (
                      <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
                        form.Estado === 'ganado' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {form.Estado === 'ganado' ? '✓ Ganado' : '✗ Perdido'}
                      </div>
                    ))}
                    {form.Estado === 'perdido' && field('Motivo pérdida', (
                      <input
                        type="text"
                        value={form.Motivo_Perdida}
                        onChange={(e) => setForm((f) => ({ ...f, Motivo_Perdida: e.target.value }))}
                        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none"
                      />
                    ))}
                  </div>
                )}

                {error && (
                  <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>
                )}
              </div>
            )}

            {/* ── ACTIVITIES TAB ── */}
            {tab === 'activities' && (
              <div className="space-y-3">
                <button
                  onClick={() => setShowActivityModal(true)}
                  className="w-full py-2.5 border border-dashed border-[var(--border)] rounded-xl text-sm text-[var(--muted)] hover:text-[var(--primary)] hover:border-[var(--primary)]/50 transition-colors"
                >
                  + Registrar actividad
                </button>
                {loadingActs ? (
                  <div className="space-y-2">
                    {[1,2,3].map(i => <div key={i} className="h-16 bg-[var(--border)]/30 rounded-xl animate-pulse" />)}
                  </div>
                ) : activities.length === 0 ? (
                  <div className="text-center py-10 text-[var(--muted)] text-sm">Sin actividades registradas</div>
                ) : (
                  activities.map((act) => (
                    <div key={act.Id} className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{
                            act.Tipo === 'Llamada' ? '📞'
                            : act.Tipo === 'WhatsApp' ? '💬'
                            : act.Tipo === 'Email' ? '📧'
                            : act.Tipo === 'Reunión' ? '🤝'
                            : '📝'
                          }</span>
                          <div>
                            <p className="text-sm font-medium text-[var(--text)]">{act.Tipo}</p>
                            <p className="text-xs text-[var(--muted)]">{act.Resultado}</p>
                          </div>
                        </div>
                        <span className="text-xs text-[var(--muted)] whitespace-nowrap">
                          {new Date(act.Fecha).toLocaleDateString('es-CO')}
                        </span>
                      </div>
                      {act.Nota && <p className="mt-2 text-xs text-[var(--muted)] leading-relaxed">{act.Nota}</p>}
                      {act.Proxima_Accion_Fecha && (
                        <p className="mt-1.5 text-xs text-amber-400">
                          📅 Próxima acción: {new Date(act.Proxima_Accion_Fecha).toLocaleDateString('es-CO')}
                          {act.Proxima_Accion_Nota && ` — ${act.Proxima_Accion_Nota}`}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── NOTES TAB ── */}
            {tab === 'notes' && (
              <div>
                <textarea
                  value={form.Notas}
                  onChange={(e) => setForm((f) => ({ ...f, Notas: e.target.value }))}
                  rows={12}
                  placeholder="Notas sobre este lead..."
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--primary)]/60 resize-none"
                />
              </div>
            )}
          </div>

          {/* Footer actions */}
          {(tab === 'info' || tab === 'notes') && (
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border)] flex-shrink-0">
              <button onClick={onClose} className="px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-[var(--primary)] text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {saving ? 'Guardando...' : lead ? 'Guardar cambios' : 'Crear lead'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sub-modal for activity */}
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
