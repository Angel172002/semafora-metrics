'use client';

import { useState, useEffect } from 'react';

interface Member {
  Id:            number;
  Email:         string;
  Nombre:        string;
  Rol:           'admin' | 'analista' | 'comercial';
  Activo:        boolean;
  Fecha_Creacion?: string;
}

const ROL_CONFIG = {
  admin:     { label: 'Admin',     color: '#e20613', bg: 'rgba(226,6,19,0.12)' },
  analista:  { label: 'Analista',  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  comercial: { label: 'Comercial', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
};

function getInitials(name: string) {
  const p = name.trim().split(' ').filter(Boolean);
  if (!p.length) return '?';
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[1][0]).toUpperCase();
}

export default function EquipoPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]  = useState(false);
  const [error,    setError]   = useState('');
  const [success,  setSuccess] = useState('');

  const [form, setForm] = useState({
    email: '', nombre: '', password: '', role: 'analista' as Member['Rol'],
  });

  async function fetchMembers() {
    setLoading(true);
    try {
      const res = await fetch('/api/equipo');
      const j   = await res.json() as { success: boolean; data: Member[] };
      if (j.success) setMembers(j.data);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchMembers(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.email || !form.nombre || !form.password) {
      setError('Todos los campos son requeridos.'); return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form }),
      });
      const j = await res.json() as { success?: boolean; error?: string };
      if (!res.ok || !j.success) { setError(j.error ?? 'Error al crear usuario'); return; }
      setSuccess(`Usuario ${form.nombre} creado exitosamente.`);
      setForm({ email: '', nombre: '', password: '', role: 'analista' });
      setShowForm(false);
      await fetchMembers();
    } catch {
      setError('Error de conexión.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(member: Member) {
    try {
      await fetch(`/api/equipo/${member.Id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ Activo: !member.Activo }),
      });
      await fetchMembers();
    } catch { /* ignore */ }
  }

  return (
    <div className="flex-1 p-4 md:p-6 max-w-3xl mx-auto w-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Equipo</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            Gestiona los miembros de tu equipo y sus roles.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setError(''); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: '#e20613' }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Agregar usuario
        </button>
      </div>

      {/* Mensajes */}
      {success && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#4ade80' }}>
          ✅ {success}
        </div>
      )}

      {/* Formulario nuevo usuario */}
      {showForm && (
        <form onSubmit={handleCreate} className="card p-5 mb-5">
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Nuevo usuario</h2>

          {error && (
            <div className="mb-4 px-3 py-2 rounded-lg text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Nombre completo</label>
              <input
                type="text"
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="María García"
                className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="maria@empresa.com"
                className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Contraseña temporal</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Mín. 8 caracteres"
                className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Rol</label>
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as Member['Rol'] }))}
                className="w-full px-3 py-2 rounded-xl text-sm text-white focus:outline-none"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
              >
                <option value="analista">Analista — solo métricas</option>
                <option value="comercial">Comercial — solo CRM</option>
                <option value="admin">Admin — acceso total</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
              style={{ background: '#e20613' }}
            >
              {saving ? (
                <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creando…</>
              ) : 'Crear usuario'}
            </button>
          </div>
        </form>
      )}

      {/* Roles info */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {Object.entries(ROL_CONFIG).map(([rol, cfg]) => (
          <div key={rol} className="card p-3 text-center">
            <div className="text-lg font-bold mb-0.5"
              style={{ color: cfg.color }}>
              {members.filter(m => m.Rol === rol && m.Activo).length}
            </div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>{cfg.label}</div>
          </div>
        ))}
      </div>

      {/* Lista de miembros */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="w-6 h-6 border-2 border-zinc-700 border-t-red-500 rounded-full animate-spin" />
          </div>
        ) : members.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              No hay usuarios configurados en la base de datos.
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted2)' }}>
              El login actual usa las variables de entorno (DASHBOARD_USER).
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {members.map(m => {
              const cfg = ROL_CONFIG[m.Rol] ?? ROL_CONFIG.analista;
              return (
                <div key={m.Id} className="flex items-center gap-3 px-5 py-3.5">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: cfg.color + 'cc' }}>
                    {getInitials(m.Nombre)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: m.Activo ? 'var(--text)' : 'var(--muted)' }}>
                      {m.Nombre}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>{m.Email}</p>
                  </div>

                  {/* Rol badge */}
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{ background: cfg.bg, color: cfg.color }}>
                    {cfg.label}
                  </span>

                  {/* Toggle activo */}
                  <button
                    onClick={() => toggleActive(m)}
                    className="flex-shrink-0 w-10 h-5 rounded-full transition-all relative"
                    style={{ background: m.Activo ? '#10b981' : 'var(--surface3)' }}
                    title={m.Activo ? 'Desactivar' : 'Activar'}
                  >
                    <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                      style={{ left: m.Activo ? '22px' : '2px' }} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Nota de seguridad */}
      <p className="text-xs mt-4 text-center" style={{ color: 'var(--muted2)' }}>
        Los roles controlan el acceso: Admin ve todo · Analista solo métricas · Comercial solo CRM
      </p>
    </div>
  );
}
