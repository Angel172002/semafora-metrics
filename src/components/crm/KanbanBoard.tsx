'use client';

import { useState } from 'react';
import { CrmStage, CrmLead } from '@/types';
import LeadCard from './LeadCard';
import { formatCOP } from '@/lib/format';

interface Props {
  stages: CrmStage[];
  leads: CrmLead[];
  loading: boolean;
  onLeadClick: (lead: CrmLead) => void;
  onAddLead: (stageId: number) => void;
  onStageDrop: (leadId: number, newStageId: number) => void;
  onViewAllStage: (stageId: number) => void;
}

function SkeletonCard() {
  return (
    <div className="card p-3 flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <div className="skeleton w-7 h-7 rounded-full" />
        <div className="skeleton h-3 flex-1" />
      </div>
      <div className="skeleton h-3 w-3/4" />
      <div className="skeleton h-3 w-1/2" />
    </div>
  );
}

const CARDS_PER_COLUMN = 15;

interface ColumnProps {
  stage: CrmStage;
  leads: CrmLead[];
  loading: boolean;
  onLeadClick: (lead: CrmLead) => void;
  onAddLead: (stageId: number) => void;
  onStageDrop: (leadId: number, newStageId: number) => void;
  onViewAllStage: (stageId: number) => void;
}

function KanbanColumn({ stage, leads, loading, onLeadClick, onAddLead, onStageDrop, onViewAllStage }: ColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const totalValue  = leads.reduce((s, l) => s + (l.Valor_Estimado ?? 0), 0);
  const stageColor  = stage.Color || '#6366f1';

  function handleDragStart(e: React.DragEvent, leadId: number) {
    e.dataTransfer.setData('text/plain', String(leadId));
    e.dataTransfer.effectAllowed = 'move';
  }
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  }
  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false);
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const leadId = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (!isNaN(leadId)) onStageDrop(leadId, stage.Id);
  }

  return (
    <div className="flex flex-col" style={{ minWidth: 272, maxWidth: 272 }}>
      {/* Column header */}
      <div
        className="rounded-t-2xl px-3 pt-3 pb-2.5 border border-b-0"
        style={{
          background: `${stageColor}10`,
          borderColor: `${stageColor}30`,
        }}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: stageColor, boxShadow: `0 0 6px ${stageColor}60` }} />
            <span className="text-sm font-bold truncate" style={{ color: 'var(--text)' }} title={stage.Nombre}>
              {stage.Nombre}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: `${stageColor}20`, color: stageColor }}
            >
              {loading ? '—' : leads.length}
            </span>
            <button
              onClick={() => onAddLead(stage.Id)}
              className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
              style={{ color: stageColor, background: `${stageColor}15`, border: 'none', cursor: 'pointer' }}
              title={`Agregar lead a ${stage.Nombre}`}
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </div>
        {/* Pipeline value */}
        {!loading && totalValue > 0 && (
          <p className="text-xs font-semibold" style={{ color: '#4ade80' }}>
            {formatCOP(totalValue, true)} en pipeline
          </p>
        )}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="flex flex-col gap-2 overflow-y-auto rounded-b-2xl border border-t-0 p-2 transition-all"
        style={{
          maxHeight: 'calc(100vh - 310px)',
          minHeight: 80,
          borderColor: isDragOver ? stageColor : `${stageColor}30`,
          background: isDragOver ? `${stageColor}06` : 'var(--surface2)',
        }}
      >
        {loading ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : leads.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-8 text-xs text-center rounded-xl gap-2"
            style={{
              color: 'var(--muted2)',
              border: `1.5px dashed ${stageColor}30`,
              minHeight: 80,
            }}
          >
            <span style={{ fontSize: 20, opacity: 0.4 }}>+</span>
            <span>Arrastra leads aquí</span>
          </div>
        ) : (
          <>
            {leads.slice(0, CARDS_PER_COLUMN).map((lead) => (
              <div key={lead.Id} draggable onDragStart={(e) => handleDragStart(e, lead.Id)}>
                <LeadCard lead={lead} onClick={onLeadClick} />
              </div>
            ))}
            {leads.length > CARDS_PER_COLUMN && (
              <button
                onClick={() => onViewAllStage(stage.Id)}
                className="w-full py-2 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: `${stageColor}12`,
                  border: `1px solid ${stageColor}30`,
                  color: stageColor,
                  cursor: 'pointer',
                }}
              >
                Ver todos · {leads.length} leads
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({ stages, leads, loading, onLeadClick, onAddLead, onStageDrop, onViewAllStage }: Props) {
  const [seeding, setSeeding] = useState(false);
  const [seedDone, setSeedDone] = useState(false);

  const sortedStages = [...stages].sort((a, b) => a.Orden - b.Orden);

  // Leads whose Stage_Id doesn't match any known stage — show in a fallback column
  const knownStageIds = new Set(sortedStages.map((s) => Number(s.Id)));
  const orphanLeads   = leads.filter((l) => !knownStageIds.has(Number(l.Stage_Id)));

  const FALLBACK_STAGE: CrmStage = {
    Id: 0, Nombre: 'Sin etapa', Orden: -1,
    Color: '#6b7280', Es_Ganado: false, Es_Perdido: false, Activo: true,
  };

  async function handleSeedStages() {
    setSeeding(true);
    try {
      const res  = await fetch('/api/crm/stages', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSeedDone(true);
        // Reload page to pick up new stages
        window.location.reload();
      } else {
        alert('Error: ' + (data.error || 'No se pudieron crear las etapas'));
      }
    } catch {
      alert('Error de red al inicializar las etapas.');
    } finally {
      setSeeding(false);
    }
  }

  // Banner when stages table is empty (shown regardless of orphan leads)
  const noStagesBanner = !loading && sortedStages.length === 0;

  return (
    <div className="flex flex-col gap-4">
      {noStagesBanner && (
        <div className="flex items-center justify-between gap-4 rounded-xl px-4 py-3"
          style={{ background: 'rgba(99,102,241,0.08)', border: '1.5px solid rgba(99,102,241,0.22)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#6366f1" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>El pipeline no tiene etapas configuradas</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Crea las 7 etapas por defecto para organizar tus {leads.length} leads correctamente.
              </p>
            </div>
          </div>
          <button
            onClick={handleSeedStages}
            disabled={seeding || seedDone}
            className="btn btn-primary flex-shrink-0"
            style={{ opacity: seeding ? 0.6 : 1, fontSize: 12 }}
          >
            {seeding ? 'Inicializando…' : seedDone ? '✓ Listo' : 'Inicializar Pipeline'}
          </button>
        </div>
      )}
    <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 300 }}>
      {loading && stages.length === 0
        ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ minWidth: 272, maxWidth: 272 }}>
              <div className="card-flat rounded-2xl p-3 mb-2 h-16 animate-pulse" />
              <div className="card-flat rounded-2xl p-3 flex flex-col gap-2">
                <SkeletonCard /><SkeletonCard /><SkeletonCard />
              </div>
            </div>
          ))
        : <>
            {orphanLeads.length > 0 && (
              <KanbanColumn
                key="orphan"
                stage={FALLBACK_STAGE}
                leads={orphanLeads}
                loading={loading}
                onLeadClick={onLeadClick}
                onAddLead={onAddLead}
                onStageDrop={onStageDrop}
                onViewAllStage={onViewAllStage}
              />
            )}
            {sortedStages.map((stage) => (
              <KanbanColumn
                key={stage.Id}
                stage={stage}
                leads={leads.filter((l) => Number(l.Stage_Id) === Number(stage.Id))}
                loading={loading}
                onLeadClick={onLeadClick}
                onAddLead={onAddLead}
                onStageDrop={onStageDrop}
                onViewAllStage={onViewAllStage}
              />
            ))}
          </>
      }
    </div>
    </div>
  );
}
