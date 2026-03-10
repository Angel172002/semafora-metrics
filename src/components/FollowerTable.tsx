'use client';

import { useState } from 'react';
import type { FollowerTableRow, Platform } from '@/types';
import { formatCOPFull } from '@/lib/format';

interface Props {
  data: FollowerTableRow[];
  loading?: boolean;
}

const PLATFORM_COLORS: Record<Platform | string, string> = {
  meta: '#1877F2', google: '#4285F4', tiktok: '#FF0050',
  instagram: '#E1306C', linkedin: '#0A66C2',
};

const PLATFORM_LABELS: Record<Platform | string, string> = {
  meta: 'Meta', google: 'Google', tiktok: 'TikTok',
  instagram: 'Instagram', linkedin: 'LinkedIn',
};

const RESULT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  'like':        { label: 'Me Gusta',  color: '#1877F2' },
  'follow':      { label: 'Seguidor',  color: '#E1306C' },
  'page_like':   { label: 'Página',    color: '#1877F2' },
};

function fmt(n: number): string { return n.toLocaleString('es-CO'); }

type SortKey = 'name' | 'followers_gained' | 'reach' | 'impressions' | 'spent' | 'cost_per_follower';
type SortDir = 'asc' | 'desc';

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span style={{ color: active ? '#1877F2' : 'var(--muted)', opacity: active ? 1 : 0.4, fontSize: 10 }}>
      {active ? (dir === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}
    </span>
  );
}

export default function FollowerTable({ data, loading }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('followers_gained');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  if (loading) {
    return (
      <div className="card p-5">
        <div className="skeleton h-5 w-48 mb-4" />
        {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-10 w-full mb-2" />)}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="card p-8 text-center" style={{ color: 'var(--muted)' }}>
        <p className="text-sm">No hay campañas de seguidores en este período</p>
        <p className="text-xs mt-1">Las campañas con objetivo "Me gusta" o "Seguidores" aparecerán aquí</p>
      </div>
    );
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  const sorted = [...data].sort((a, b) => {
    const av = sortKey === 'name' ? a.name : (a[sortKey] as number);
    const bv = sortKey === 'name' ? b.name : (b[sortKey] as number);
    if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
    return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  function th(label: string, key: SortKey, align: 'left' | 'right' = 'right') {
    return (
      <th className={align === 'right' ? 'text-right' : ''}
        style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
        onClick={() => handleSort(key)}>
        {label}<SortIcon active={sortKey === key} dir={sortDir} />
      </th>
    );
  }

  const totalFollowers = sorted.reduce((s, r) => s + r.followers_gained, 0);
  const totalSpent = sorted.reduce((s, r) => s + r.spent, 0);
  const avgCPF = totalFollowers > 0 ? totalSpent / totalFollowers : 0;

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Seguidores y Me Gusta</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              {sorted.length} campañas · {fmt(totalFollowers)} seguidores/likes ganados
            </p>
          </div>
          {avgCPF > 0 && (
            <div className="text-right">
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Costo promedio por seguidor</p>
              <p className="text-sm font-bold font-mono" style={{ color: '#ec4899' }}>
                {formatCOPFull(avgCPF)}
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {th('Campaña', 'name', 'left')}
              <th>Plataforma</th>
              <th className="text-right">Tipo</th>
              {th('Seguidores/Likes', 'followers_gained')}
              {th('Alcance', 'reach')}
              {th('Impresiones', 'impressions')}
              {th('Invertido (COP)', 'spent')}
              {th('Costo/Seguidor', 'cost_per_follower')}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const platColor = PLATFORM_COLORS[row.platform] || '#6b7280';
              const rtInfo = RESULT_TYPE_LABELS[row.result_type] || { label: row.result_type, color: '#6b7280' };
              return (
                <tr key={row.id}>
                  <td>
                    <span className="font-medium text-xs" style={{ color: 'var(--text)' }}>
                      {row.name.length > 32 ? row.name.substring(0, 30) + '…' : row.name}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs font-semibold" style={{ color: platColor }}>
                      {PLATFORM_LABELS[row.platform] || row.platform}
                    </span>
                  </td>
                  <td className="text-right">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{ background: `${rtInfo.color}18`, color: rtInfo.color }}>
                      {rtInfo.label}
                    </span>
                  </td>
                  <td className="text-right font-mono text-xs font-bold" style={{ color: '#ec4899' }}>
                    {fmt(row.followers_gained)}
                  </td>
                  <td className="text-right font-mono text-xs" style={{ color: 'var(--muted)' }}>
                    {fmt(row.reach)}
                  </td>
                  <td className="text-right font-mono text-xs" style={{ color: 'var(--muted)' }}>
                    {fmt(row.impressions)}
                  </td>
                  <td className="text-right font-mono text-xs font-semibold" style={{ color: 'var(--text)' }}>
                    {formatCOPFull(row.spent)}
                  </td>
                  <td className="text-right font-mono text-xs" style={{ color: '#f59e0b' }}>
                    {row.cost_per_follower > 0 ? formatCOPFull(row.cost_per_follower) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
