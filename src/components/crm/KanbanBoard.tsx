'use client';

import { useState } from 'react';
import { CrmStage, CrmLead } from '@/types';
import LeadCard from './LeadCard';

interface Props {
  stages: CrmStage[];
  leads: CrmLead[];
  loading: boolean;
  onLeadClick: (lead: CrmLead) => void;
  onAddLead: (stageId: number) => void;
  onStageDrop: (leadId: number, newStageId: number) => void;
  onViewAllStage: (stageId: number) => void;
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 flex flex-col gap-2">
      <div className="h-3 w-3/4 rounded bg-white/5 animate-pulse" />
      <div className="h-3 w-1/2 rounded bg-white/5 animate-pulse" />
      <div className="h-3 w-1/3 rounded bg-white/5 animate-pulse" />
    </div>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────

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

  function handleDragStart(e: React.DragEvent<HTMLDivElement>, leadId: number) {
    e.dataTransfer.setData('text/plain', String(leadId));
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    // Only clear if actually leaving the column (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const raw = e.dataTransfer.getData('text/plain');
    const leadId = parseInt(raw, 10);
    if (!isNaN(leadId)) {
      onStageDrop(leadId, stage.Id);
    }
  }

  return (
    <div className="flex flex-col min-w-[260px] max-w-[260px]">
      {/* Column header */}
      <div
        className="flex items-center justify-between mb-2 px-1"
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Colored dot */}
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: stage.Color }}
          />
          {/* Stage name */}
          <span
            className="text-sm font-semibold truncate"
            style={{ color: 'var(--text)' }}
            title={stage.Nombre}
          >
            {stage.Nombre}
          </span>
          {/* Count badge */}
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{ background: 'rgba(148,163,184,0.12)', color: 'var(--muted)' }}
          >
            {loading ? '—' : leads.length}
          </span>
        </div>
        {/* Add button */}
        <button
          onClick={() => onAddLead(stage.Id)}
          className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 hover:bg-white/10 transition-colors text-lg leading-none"
          style={{ color: 'var(--muted)' }}
          title={`Agregar lead a ${stage.Nombre}`}
          aria-label={`Agregar lead a ${stage.Nombre}`}
        >
          +
        </button>
      </div>

      {/* Drop zone / scrollable card list */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="flex flex-col gap-2 overflow-y-auto rounded-xl transition-colors"
        style={{
          maxHeight: 'calc(100vh - 220px)',
          background: isDragOver ? 'rgba(226,6,19,0.04)' : 'transparent',
          border: isDragOver ? '1.5px dashed rgba(226,6,19,0.35)' : '1.5px dashed transparent',
          padding: '4px',
        }}
      >
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : leads.length === 0 ? (
          <div
            className="flex items-center justify-center py-8 text-xs text-center rounded-lg"
            style={{ color: 'var(--muted)' }}
          >
            Sin leads en esta etapa
          </div>
        ) : (
          <>
            {leads.slice(0, CARDS_PER_COLUMN).map((lead) => (
              <div
                key={lead.Id}
                draggable
                onDragStart={(e) => handleDragStart(e, lead.Id)}
              >
                <LeadCard lead={lead} onClick={onLeadClick} />
              </div>
            ))}
            {/* "Ver todos" badge when there are more cards */}
            {leads.length > CARDS_PER_COLUMN && (
              <button
                onClick={() => onViewAllStage(stage.Id)}
                className="w-full py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
                style={{
                  background: `${stage.Color}18`,
                  border: `1px solid ${stage.Color}40`,
                  color: stage.Color,
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

// ─── Board ────────────────────────────────────────────────────────────────────

export default function KanbanBoard({ stages, leads, loading, onLeadClick, onAddLead, onStageDrop, onViewAllStage }: Props) {
  // Sort stages by Orden
  const sortedStages = [...stages].sort((a, b) => a.Orden - b.Orden);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {loading && stages.length === 0
        ? // Show placeholder columns while loading
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col min-w-[260px] max-w-[260px]">
              <div className="flex items-center gap-2 mb-2 px-1">
                <div className="w-2.5 h-2.5 rounded-full bg-white/10 animate-pulse" />
                <div className="h-3 w-24 rounded bg-white/10 animate-pulse" />
              </div>
              <div className="flex flex-col gap-2">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            </div>
          ))
        : sortedStages.map((stage) => {
            const stageLeads = leads.filter((l) => l.Stage_Id === stage.Id);
            return (
              <KanbanColumn
                key={stage.Id}
                stage={stage}
                leads={stageLeads}
                loading={loading}
                onLeadClick={onLeadClick}
                onAddLead={onAddLead}
                onStageDrop={onStageDrop}
                onViewAllStage={onViewAllStage}
              />
            );
          })}
    </div>
  );
}
