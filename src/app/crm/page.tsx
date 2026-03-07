'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CrmLead, CrmStage, CrmUser, CrmStats as CrmStatsType } from '@/types';
import CrmStats from '@/components/crm/CrmStats';
import KanbanBoard from '@/components/crm/KanbanBoard';
import LeadsTable from '@/components/crm/LeadsTable';
import LeadModal from '@/components/crm/LeadModal';

type ViewMode = 'kanban' | 'list';

export default function CrmPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [stages, setStages] = useState<CrmStage[]>([]);
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [stats, setStats] = useState<CrmStatsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'create'>('view');
  const [defaultStageId, setDefaultStageId] = useState<number | undefined>();

  // ─── Data fetching ────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [leadsRes, stagesRes, usersRes, statsRes] = await Promise.all([
        fetch('/api/crm/leads'),
        fetch('/api/crm/stages'),
        fetch('/api/crm/users'),
        fetch('/api/crm/stats'),
      ]);

      const [leadsData, stagesData, usersData, statsData] = await Promise.all([
        leadsRes.json(),
        stagesRes.json(),
        usersRes.json(),
        statsRes.json(),
      ]);

      if (leadsData.success)  setLeads(leadsData.data ?? []);
      if (stagesData.success) setStages(stagesData.data ?? []);
      if (usersData.success)  setUsers(usersData.data ?? []);
      if (statsData.success)  setStats(statsData.data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── Kanban drag & drop handler ──────────────────────────────────────────
  const handleStageDrop = useCallback(async (leadId: number, newStageId: number) => {
    const stage = stages.find((s) => s.Id === newStageId);
    if (!stage) return;

    // Optimistic update
    setLeads((prev) =>
      prev.map((l) =>
        l.Id === leadId
          ? { ...l, Stage_Id: newStageId, Stage_Nombre: stage.Nombre, Stage_Color: stage.Color }
          : l
      )
    );

    try {
      const res = await fetch(`/api/crm/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Stage_Id: newStageId }),
      });
      if (!res.ok) {
        // Revert on failure
        fetchAll();
      }
    } catch {
      fetchAll();
    }
  }, [stages, fetchAll]);

  // ─── Modal handlers ───────────────────────────────────────────────────────
  const handleLeadClick = useCallback((lead: CrmLead) => {
    setSelectedLead(lead);
    setModalMode('view');
    setDefaultStageId(undefined);
    setIsModalOpen(true);
  }, []);

  const handleAddLead = useCallback((stageId?: number) => {
    setSelectedLead(null);
    setModalMode('create');
    setDefaultStageId(stageId);
    setIsModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setSelectedLead(null);
  }, []);

  const handleModalSave = useCallback(async () => {
    setIsModalOpen(false);
    setSelectedLead(null);
    await fetchAll();
  }, [fetchAll]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-screen bg-[var(--bg)]">
      {/* ── Header ── */}
      <div className="px-4 md:px-6 pt-6 pb-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-2xl font-bold text-white">CRM</h1>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">
              Pipeline de ventas y gestión de clientes
            </p>
          </div>
          <button
            onClick={() => handleAddLead()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-green)] text-black font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <span className="text-lg leading-none">+</span>
            Nuevo Lead
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="px-4 md:px-6 pt-4">
        <CrmStats stats={stats} loading={loading} />
      </div>

      {/* ── View Tabs ── */}
      <div className="px-4 md:px-6 pt-4 pb-2 flex items-center gap-1">
        <button
          onClick={() => setViewMode('kanban')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'kanban'
              ? 'bg-white/10 text-white'
              : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          Kanban
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'list'
              ? 'bg-white/10 text-white'
              : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          Lista
        </button>

        {/* Lead count badge */}
        {!loading && (
          <span className="ml-auto text-xs text-[var(--text-muted)] bg-white/5 px-3 py-1 rounded-full">
            {leads.length} lead{leads.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mx-4 md:mx-6 mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error} —{' '}
          <button onClick={fetchAll} className="underline hover:no-underline">
            Reintentar
          </button>
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'kanban' ? (
          <div className="h-full">
            <KanbanBoard
              leads={leads}
              stages={stages}
              loading={loading}
              onLeadClick={handleLeadClick}
              onStageDrop={handleStageDrop}
              onAddLead={handleAddLead}
            />
          </div>
        ) : (
          <div className="px-4 md:px-6 pb-6">
            <LeadsTable
              leads={leads}
              loading={loading}
              onLeadClick={handleLeadClick}
            />
          </div>
        )}
      </div>

      {/* ── Lead Modal ── */}
      <LeadModal
        isOpen={isModalOpen}
        lead={selectedLead}
        stages={stages}
        users={users}
        mode={modalMode}
        defaultStageId={defaultStageId}
        onClose={handleModalClose}
        onSaved={handleModalSave}
      />
    </div>
  );
}
