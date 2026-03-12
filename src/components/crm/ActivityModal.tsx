'use client';

import { useState } from 'react';
import { useToast } from '@/components/Toast';
import { ACTIVITY_TYPES, ACTIVITY_ICONS } from '@/lib/crmConstants';
import type { CrmActivityType } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  leadId: number;
  leadName: string;
  onSaved: () => void;
}

const RESULT_OPTIONS = [
  'Contactó',
  'No contestó',
  'Interesado',
  'No interesado',
  'Propuesta enviada',
  'Cerrado',
];

const TYPE_COLOR: Record<string, string> = {
  'Llamada':            '#3b82f6',
  'WhatsApp':           '#25D366',
  'Envío de Propuesta': '#f97316',
  'Reunión':            '#a855f7',
};

export default function ActivityModal({ isOpen, onClose, leadId, leadName, onSaved }: Props) {
  const [tipo, setTipo] = useState<CrmActivityType>('Llamada');
  const [resultado, setResultado] = useState('Contactó');
  const [nota, setNota] = useState('');
  const [proximaFecha, setProximaFecha] = useState('');
  const [proximaNota, setProximaNota] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  if (!isOpen) return null;

  function handleClose() {
    if (loading) return;
    setError(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/crm/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Lead_Id:             leadId,
          Lead_Nombre:         leadName,
          Tipo:                tipo,
          Resultado:           resultado,
          Nota:                nota,
          Proxima_Accion_Fecha: proximaFecha || null,
          Proxima_Accion_Nota:  proximaNota  || null,
          Fecha:               new Date().toISOString(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Error al guardar la actividad');

      toast.success(`Actividad "${tipo}" registrada`);
      onSaved();
      onClose();
      setTipo('Llamada');
      setResultado('Contactó');
      setNota('');
      setProximaFecha('');
      setProximaNota('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setError(msg);
      toast.error(`Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  const tipoColor = TYPE_COLOR[tipo] ?? '#6366f1';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="absolute inset-0 bg-black/60" />

      <div
        className="relative rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', zIndex: 1 }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
              Registrar actividad
            </h2>
            <p className="text-sm mt-0.5 truncate max-w-[300px]" style={{ color: 'var(--muted)' }}>
              {leadName}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
            style={{ color: 'var(--muted)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Tipo — botones visuales */}
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: 'var(--muted)' }}>
              Tipo de actividad
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ACTIVITY_TYPES.map((t) => {
                const active = tipo === t;
                const color  = TYPE_COLOR[t] ?? '#6366f1';
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipo(t as CrmActivityType)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: active ? `${color}20` : 'var(--surface2)',
                      color:      active ? color        : 'var(--muted)',
                      border:     active ? `1.5px solid ${color}50` : '1.5px solid var(--border)',
                    }}
                  >
                    <span className="text-base leading-none">{ACTIVITY_ICONS[t]}</span>
                    <span>{t}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Resultado */}
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--muted)' }}>
              Resultado
            </label>
            <select
              value={resultado}
              onChange={(e) => setResultado(e.target.value)}
              className="input-field"
              style={{
                paddingRight: 32, appearance: 'none',
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238888a0' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
              }}
            >
              {RESULT_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Nota */}
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--muted)' }}>
              Nota
            </label>
            <textarea
              rows={3}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Describe el resultado de la actividad..."
              className="input-field"
              style={{ resize: 'none' }}
            />
          </div>

          {/* Próxima acción */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--muted)' }}>
                Próxima acción — fecha
              </label>
              <input
                type="date"
                value={proximaFecha}
                onChange={(e) => setProximaFecha(e.target.value)}
                className="input-field"
                style={{ colorScheme: 'dark' as const }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--muted)' }}>
                Descripción
              </label>
              <input
                type="text"
                value={proximaNota}
                onChange={(e) => setProximaNota(e.target.value)}
                placeholder="Ej: Llamar para seguimiento"
                className="input-field"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm px-3 py-2 rounded-lg"
              style={{ background: 'rgba(226,6,19,0.1)', color: '#f87171', border: '1px solid rgba(226,6,19,0.3)' }}>
              {error}
            </p>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--muted)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-60"
              style={{ background: loading ? `${tipoColor}80` : tipoColor, color: '#fff' }}
            >
              {loading ? 'Guardando...' : 'Guardar actividad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
