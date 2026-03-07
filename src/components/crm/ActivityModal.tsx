'use client';

import { useState } from 'react';
import { CrmActivityType, CrmActivityResult } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  leadId: number;
  leadName: string;
  onSaved: () => void;
}

const ACTIVITY_TYPES: CrmActivityType[] = ['Nota', 'Llamada', 'WhatsApp', 'Email', 'Reunión'];
const RESULT_OPTIONS: CrmActivityResult[] = [
  'Contactó',
  'No contestó',
  'Interesado',
  'No interesado',
  'Propuesta enviada',
  'Cerrado',
];

const TYPE_ICON: Record<CrmActivityType, string> = {
  Llamada: '📞',
  WhatsApp: '💬',
  Email: '✉️',
  Reunión: '📅',
  Nota: '📝',
};

export default function ActivityModal({ isOpen, onClose, leadId, leadName, onSaved }: Props) {
  const [tipo, setTipo] = useState<CrmActivityType>('Nota');
  const [resultado, setResultado] = useState<CrmActivityResult>('Contactó');
  const [nota, setNota] = useState('');
  const [proximaFecha, setProximaFecha] = useState('');
  const [proximaNota, setProximaNota] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          Lead_Id: leadId,
          Lead_Nombre: leadName,
          Tipo: tipo,
          Resultado: resultado,
          Nota: nota,
          Proxima_Accion_Fecha: proximaFecha || null,
          Proxima_Accion_Nota: proximaNota || null,
          Fecha: new Date().toISOString(),
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'Error al guardar la actividad');
      }

      onSaved();
      onClose();
      // Reset form
      setTipo('Nota');
      setResultado('Contactó');
      setNota('');
      setProximaFecha('');
      setProximaNota('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Panel */}
      <div
        className="relative bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl"
        style={{ zIndex: 1 }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
              Nueva actividad
            </h2>
            <p className="text-sm mt-0.5 truncate max-w-[340px]" style={{ color: 'var(--muted)' }}>
              {leadName}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors text-xl leading-none"
            style={{ color: 'var(--muted)' }}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Tipo */}
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--muted)' }}>
              Tipo de actividad
            </label>
            <div className="flex flex-wrap gap-2">
              {ACTIVITY_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: tipo === t ? 'var(--primary)' : 'var(--chip-bg)',
                    color: tipo === t ? '#fff' : 'var(--muted)',
                    border: tipo === t ? '1px solid var(--primary)' : '1px solid var(--border)',
                  }}
                >
                  <span>{TYPE_ICON[t]}</span>
                  <span>{t}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Resultado */}
          <div>
            <label
              htmlFor="resultado"
              className="text-xs font-semibold mb-1.5 block"
              style={{ color: 'var(--muted)' }}
            >
              Resultado
            </label>
            <select
              id="resultado"
              value={resultado}
              onChange={(e) => setResultado(e.target.value as CrmActivityResult)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--primary)]"
              style={{
                background: 'var(--input-bg)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
            >
              {RESULT_OPTIONS.map((r) => (
                <option key={r} value={r} style={{ background: 'var(--option-bg)', color: 'var(--text)' }}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Nota */}
          <div>
            <label
              htmlFor="nota"
              className="text-xs font-semibold mb-1.5 block"
              style={{ color: 'var(--muted)' }}
            >
              Nota
            </label>
            <textarea
              id="nota"
              rows={4}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Describe el resultado de la actividad..."
              className="w-full rounded-lg px-3 py-2 text-sm resize-none outline-none focus:ring-1"
              style={{
                background: 'var(--input-bg)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
            />
          </div>

          {/* Próxima acción */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="proxima-fecha"
                className="text-xs font-semibold mb-1.5 block"
                style={{ color: 'var(--muted)' }}
              >
                Próxima acción — fecha
              </label>
              <input
                id="proxima-fecha"
                type="date"
                value={proximaFecha}
                onChange={(e) => setProximaFecha(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-1"
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  colorScheme: 'dark' as const,
                }}
              />
            </div>
            <div>
              <label
                htmlFor="proxima-nota"
                className="text-xs font-semibold mb-1.5 block"
                style={{ color: 'var(--muted)' }}
              >
                Próxima acción — descripción
              </label>
              <input
                id="proxima-nota"
                type="text"
                value={proximaNota}
                onChange={(e) => setProximaNota(e.target.value)}
                placeholder="Ej: Llamar para seguimiento"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-1"
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p
              className="text-sm px-3 py-2 rounded-lg"
              style={{ background: 'rgba(226,6,19,0.1)', color: '#f87171', border: '1px solid rgba(226,6,19,0.3)' }}
            >
              {error}
            </p>
          )}

          {/* Submit */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border)',
                color: 'var(--muted)',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-60"
              style={{
                background: loading ? 'rgba(226,6,19,0.6)' : 'var(--primary)',
                color: '#fff',
              }}
            >
              {loading ? 'Guardando...' : 'Guardar actividad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
