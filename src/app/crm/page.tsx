'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { CrmLead, CrmStage, CrmUser, CrmStats as CrmStatsType, CrmLeadStatus } from '@/types';
import CrmStats from '@/components/crm/CrmStats';
import KanbanBoard from '@/components/crm/KanbanBoard';
import LeadsTable from '@/components/crm/LeadsTable';
import LeadModal from '@/components/crm/LeadModal';

type ViewMode = 'kanban' | 'list';

const LIST_LIMIT = 50;

export default function CrmPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');

  // ── Shared meta ────────────────────────────────────────────────────────────
  const [stages, setStages] = useState<CrmStage[]>([]);
  const [users,  setUsers]  = useState<CrmUser[]>([]);
  const [stats,  setStats]  = useState<CrmStatsType | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);

  // ── Kanban: ONLY active leads (status=abierto) ────────────────────────────
  const [kanbanLeads,   setKanbanLeads]   = useState<CrmLead[]>([]);
  const [kanbanLoading, setKanbanLoading] = useState(true);
  const [kanbanError,   setKanbanError]   = useState<string | null>(null);

  // ── List: server-side paginated ────────────────────────────────────────────
  const [listLeads,   setListLeads]   = useState<CrmLead[]>([]);
  const [listPage,    setListPage]    = useState(1);
  const [listTotal,   setListTotal]   = useState(0);
  const [listPages,   setListPages]   = useState(1);
  const [listLoading, setListLoading] = useState(false);

  // List filters — controlled here, sent to API
  const [listSearch,  setListSearch]  = useState('');
  const [listStatus,  setListStatus]  = useState<'todos' | CrmLeadStatus>('todos');
  const [listOrigin,  setListOrigin]  = useState('');
  const [listStageId, setListStageId] = useState('');

  // Debounce ref for search
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modal state
  const [selectedLead,   setSelectedLead]   = useState<CrmLead | null>(null);
  const [isModalOpen,    setIsModalOpen]     = useState(false);
  const [modalMode,      setModalMode]       = useState<'view' | 'create'>('view');
  const [defaultStageId, setDefaultStageId] = useState<number | undefined>();

  // ─── Fetch meta (stages + users + stats) ─────────────────────────────────
  const fetchMeta = useCallback(async () => {
    setMetaLoading(true);
    try {
      const [sr, ur, str] = await Promise.all([
        fetch('/api/crm/stages'),
        fetch('/api/crm/users'),
        fetch('/api/crm/stats'),
      ]);
      const [sd, ud, std] = await Promise.all([sr.json(), ur.json(), str.json()]);
      if (sd.success)  setStages(sd.data  ?? []);
      if (ud.success)  setUsers(ud.data   ?? []);
      if (std.success) setStats(std.data  ?? null);
    } catch (e) {
      console.error('[crm] fetchMeta error:', e);
    } finally {
      setMetaLoading(false);
    }
  }, []);

  // ─── Fetch Kanban: only active/open leads ────────────────────────────────
  const fetchKanban = useCallback(async () => {
    setKanbanLoading(true);
    setKanbanError(null);
    try {
      const res  = await fetch('/api/crm/leads?status=abierto');
      const data = await res.json();
      if (data.success) setKanbanLeads(data.data ?? []);
      else setKanbanError(data.error || 'Error al cargar Kanban');
    } catch (e) {
      setKanbanError(e instanceof Error ? e.message : 'Error al cargar datos');
    } finally {
      setKanbanLoading(false);
    }
  }, []);

  // ─── Fetch List: one page at a time ──────────────────────────────────────
  const fetchList = useCallback(async (
    page: number,
    search: string,
    status: string,
    origin: string,
    stageId: string,
  ) => {
    setListLoading(true);
    try {
      const qs = new URLSearchParams({
        page:  String(page),
        limit: String(LIST_LIMIT),
        ...(search.trim()      && { search: search.trim() }),
        ...(status !== 'todos' && { status }),
        ...(origin             && { origin }),
        ...(stageId            && { stage: stageId }),
      });
      const res  = await fetch(`/api/crm/leads?${qs}`);
      const data = await res.json();
      if (data.success) {
        setListLeads(data.data  ?? []);
        setListTotal(data.total ?? 0);
        setListPages(data.pages ?? 1);
        setListPage(page);
      }
    } catch (e) {
      console.error('[crm] fetchList error:', e);
    } finally {
      setListLoading(false);
    }
  }, []);

  // ─── Initial load ────────────────────────────────────────────────────────
  useEffect(() => {
    fetchMeta();
    fetchKanban();
  }, [fetchMeta, fetchKanban]);

  // Load list page 1 when switching to list view
  useEffect(() => {
    if (viewMode === 'list') {
      fetchList(1, listSearch, listStatus, listOrigin, listStageId);
    }
  }, [viewMode]); // intentionally not exhaustive — only run on view switch

  // ─── List filter handlers ────────────────────────────────────────────────
  const handleListSearch = useCallback((v: string) => {
    setListSearch(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchList(1, v, listStatus, listOrigin, listStageId);
    }, 400);
  }, [fetchList, listStatus, listOrigin, listStageId]);

  const handleListStatus = useCallback((v: 'todos' | CrmLeadStatus) => {
    setListStatus(v);
    fetchList(1, listSearch, v, listOrigin, listStageId);
  }, [fetchList, listSearch, listOrigin, listStageId]);

  const handleListOrigin = useCallback((v: string) => {
    setListOrigin(v);
    fetchList(1, listSearch, listStatus, v, listStageId);
  }, [fetchList, listSearch, listStatus, listStageId]);

  const handleListStageId = useCallback((v: string) => {
    setListStageId(v);
    fetchList(1, listSearch, listStatus, listOrigin, v);
  }, [fetchList, listSearch, listStatus, listOrigin]);

  const handleListPageChange = useCallback((page: number) => {
    fetchList(page, listSearch, listStatus, listOrigin, listStageId);
  }, [fetchList, listSearch, listStatus, listOrigin, listStageId]);

  // ─── Kanban drag & drop ──────────────────────────────────────────────────
  const handleStageDrop = useCallback(async (leadId: number, newStageId: number) => {
    const stage = stages.find((s) => s.Id === newStageId);
    if (!stage) return;

    // Optimistic update
    setKanbanLeads((prev) =>
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
      if (!res.ok) fetchKanban();
    } catch {
      fetchKanban();
    }
  }, [stages, fetchKanban]);

  // ─── "Ver todos" (Kanban → List filtered by stage) ──────────────────────
  const handleViewAllStage = useCallback((stageId: number) => {
    const sid = String(stageId);
    setListStageId(sid);
    setListSearch('');
    setListStatus('todos');
    setListOrigin('');
    setViewMode('list');
    fetchList(1, '', 'todos', '', sid);
  }, [fetchList]);

  const handleSwitchToKanban = useCallback(() => {
    setViewMode('kanban');
  }, []);

  // ─── Modal handlers ──────────────────────────────────────────────────────
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
    fetchMeta();
    fetchKanban();
    if (viewMode === 'list') {
      fetchList(listPage, listSearch, listStatus, listOrigin, listStageId);
    }
  }, [fetchMeta, fetchKanban, fetchList, viewMode, listPage, listSearch, listStatus, listOrigin, listStageId]);

  // ─── Render ──────────────────────────────────────────────────────────────
  const loading = metaLoading || kanbanLoading;

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
        <CrmStats stats={stats} loading={metaLoading} />
      </div>

      {/* ── View Tabs ── */}
      <div className="px-4 md:px-6 pt-4 pb-2 flex items-center gap-1">
        <button
          onClick={handleSwitchToKanban}
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

        {/* Kanban: active leads count / List: total filtered */}
        {viewMode === 'kanban' && !kanbanLoading && (
          <span className="ml-auto text-xs text-[var(--text-muted)] bg-white/5 px-3 py-1 rounded-full">
            {kanbanLeads.length} activo{kanbanLeads.length !== 1 ? 's' : ''}
          </span>
        )}
        {viewMode === 'list' && !listLoading && (
          <span className="ml-auto text-xs text-[var(--text-muted)] bg-white/5 px-3 py-1 rounded-full">
            {listTotal.toLocaleString('es-CO')} lead{listTotal !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── Error ── */}
      {kanbanError && viewMode === 'kanban' && (
        <div className="mx-4 md:mx-6 mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {kanbanError} —{' '}
          <button onClick={fetchKanban} className="underline hover:no-underline">
            Reintentar
          </button>
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'kanban' ? (
          <div className="h-full">
            <KanbanBoard
              leads={kanbanLeads}
              stages={stages}
              loading={loading}
              onLeadClick={handleLeadClick}
              onStageDrop={handleStageDrop}
              onAddLead={handleAddLead}
              onViewAllStage={handleViewAllStage}
            />
          </div>
        ) : (
          <div className="px-4 md:px-6 pb-6">
            <LeadsTable
              leads={listLeads}
              stages={stages}
              loading={listLoading}
              total={listTotal}
              page={listPage}
              totalPages={listPages}
              search={listSearch}
              status={listStatus}
              origin={listOrigin}
              stageId={listStageId}
              onLeadClick={handleLeadClick}
              onPageChange={handleListPageChange}
              onSearchChange={handleListSearch}
              onStatusChange={handleListStatus}
              onOriginChange={handleListOrigin}
              onStageIdChange={handleListStageId}
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
