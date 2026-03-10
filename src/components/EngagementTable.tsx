'use client';

import { useState } from 'react';
import type { EngagementTableRow, Platform } from '@/types';
import { formatCOPFull } from '@/lib/format';

interface Props {
  data: EngagementTableRow[];
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

function fmt(n: number): string { return n.toLocaleString('es-CO'); }

type SortKey = 'name' | 'likes' | 'comments' | 'shares' | 'video_views' | 'reach' | 'impressions' | 'spent';
type SortDir = 'asc' | 'desc';

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span style={{ color: active ? '#1877F2' : 'var(--muted)', opacity: active ? 1 : 0.4, fontSize: 10 }}>
      {active ? (dir === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}
    </span>
  );
}

export default function EngagementTable({ data, loading }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('likes');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  if (loading) {
    return (
      <div className="card p-5">
        <div className="skeleton h-5 w-48 mb-4" />
        {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-10 w-full mb-2" />)}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="card p-8 text-center" style={{ color: 'var(--muted)' }}>
        <p className="text-sm">No hay datos de engagement para este período</p>
        <p className="text-xs mt-1">Las campañas necesitan likes, comentarios o vistas de video para aparecer aquí</p>
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

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
        <div>
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Engagement por Campaña</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            {sorted.length} campañas · likes, comentarios, compartidos, vistas de video
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {th('Campaña', 'name', 'left')}
              <th>Plataforma</th>
              {th('❤️ Likes', 'likes')}
              {th('💬 Comentarios', 'comments')}
              {th('↗️ Compartidos', 'shares')}
              {th('▶️ Video Views', 'video_views')}
              {th('Alcance', 'reach')}
              {th('Impresiones', 'impressions')}
              {th('Invertido (COP)', 'spent')}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const platColor = PLATFORM_COLORS[row.platform] || '#6b7280';
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
                  <td className="text-right font-mono text-xs font-semibold" style={{ color: '#ec4899' }}>
                    {fmt(row.likes)}
                  </td>
                  <td className="text-right font-mono text-xs" style={{ color: '#8b5cf6' }}>
                    {fmt(row.comments)}
                  </td>
                  <td className="text-right font-mono text-xs" style={{ color: '#06b6d4' }}>
                    {fmt(row.shares)}
                  </td>
                  <td className="text-right font-mono text-xs font-semibold" style={{ color: '#f59e0b' }}>
                    {fmt(row.video_views)}
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
