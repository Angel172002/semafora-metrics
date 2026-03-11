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

  const [stages, setStages] = useState<CrmStage[]>([]);
  const [users,  setUsers]  = useState<CrmUser[]>([]);
  const [stats,  setStats]  = useState<CrmStatsType | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);

  const [kanbanLeads,   setKanbanLeads]   = useState<CrmLead[]>([]);
  const [kanbanLoading, setKanbanLoading] = useState(true);
  const [kanbanError,   setKanbanError]   = useState<string | null>(null);

  const [listLeads,   setListLeads]   = useState<CrmLead[]>([]);
  const [listPage,    setListPage]    = useState(1);
  const [listTotal,   setListTotal]   = useState(0);
  const [listPages,   setListPages]   = useState(1);
  const [listLoading, setListLoading] = useState(false);

  const [listSearch,  setListSearch]  = useState('');
  const [listStatus,  setListStatus]  = useState<'todos' | CrmLeadStatus>('todos');
  const [listOrigin,  setListOrigin]  = useState('');
  const [listStageId, setListStageId] = useState('');

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedLead,   setSelectedLead]   = useState<CrmLead | null>(null);
  const [isModalOpen,    setIsModalOpen]     = useState(false);
  const [modalMode,      setModalMode]       = useState<'view' | 'create'>('view');
  const [defaultStageId, setDefaultStageId] = useState<number | undefined>();

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

  const fetchList = useCallback(async (
    page: number, search: string, status: string, origin: string, stageId: string,
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

  useEffect(() => {
    fetchMeta();
    fetchKanban();
  }, [fetchMeta, fetchKanban]);

  useEffect(() => {
    if (viewMode === 'list') fetchList(1, listSearch, listStatus, listOrigin, listStageId);
  }, [viewMode]); // eslint-disable-line

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

  const handleStageDrop = useCallback(async (leadId: number, newStageId: number) => {
    const stage = stages.find((s) => s.Id === newStageId);
    if (!stage) return;
    setKanbanLeads((prev) =>
      prev.map((l) => l.Id === leadId
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
    } catch { fetchKanban(); }
  }, [stages, fetchKanban]);

  const handleViewAllStage = useCallback((stageId: number) => {
    const sid = String(stageId);
    setListStageId(sid);
    setListSearch('');
    setListStatus('todos');
    setListOrigin('');
    setViewMode('list');
    fetchList(1, '', 'todos', '', sid);
  }, [fetchList]);

  const handleLeadClick   = useCallback((lead: CrmLead) => {
    setSelectedLead(lead); setModalMode('view'); setDefaultStageId(undefined); setIsModalOpen(true);
  }, []);

  const handleAddLead     = useCallback((stageId?: number) => {
    setSelectedLead(null); setModalMode('create'); setDefaultStageId(stageId); setIsModalOpen(true);
  }, []);

  const handleModalClose  = useCallback(() => { setIsModalOpen(false); setSelectedLead(null); }, []);

  const handleModalSave   = useCallback(async () => {
    setIsModalOpen(false); setSelectedLead(null);
    fetchMeta(); fetchKanban();
    if (viewMode === 'list') fetchList(listPage, listSearch, listStatus, listOrigin, listStageId);
  }, [fetchMeta, fetchKanban, fetchList, viewMode, listPage, listSearch, listStatus, listOrigin, listStageId]);

  const loading = metaLoading || kanbanLoading;

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* ── Top section: stats ── */}
      <div className="px-4 md:px-6 pt-5 pb-0 border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="section-title">Gestión de clientes</p>
            <h1 className="text-xl font-extrabold" style={{ color: 'var(--text)', letterSpacing: '-0.01em' }}>
              Pipeline de Ventas
            </h1>
          </div>
          <button
            onClick={() => handleAddLead()}
            className="btn btn-success"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nuevo Lead
          </button>
        </div>

        {/* Stats bar */}
        <CrmStats stats={stats} loading={metaLoading} />

        {/* View tabs */}
        <div className="flex items-center gap-0 mt-4 -mb-px">
          <button
            onClick={() => setViewMode('kanban')}
            className={`tab-item ${viewMode === 'kanban' ? 'active' : ''}`}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="5" height="18" rx="1" />
              <rect x="10" y="3" width="5" height="12" rx="1" />
              <rect x="17" y="3" width="4" height="16" rx="1" />
            </svg>
            Kanban
            {!kanbanLoading && (
              <span className="tab-count" style={{
                background: viewMode === 'kanban' ? 'rgba(99,102,241,0.18)' : 'var(--surface2)',
                color: viewMode === 'kanban' ? 'var(--accent)' : 'var(--muted)',
              }}>
                {kanbanLeads.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`tab-item ${viewMode === 'list' ? 'active' : ''}`}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            Lista
            {viewMode === 'list' && !listLoading && listTotal > 0 && (
              <span className="tab-count" style={{ background: 'rgba(99,102,241,0.18)', color: 'var(--accent)' }}>
                {listTotal.toLocaleString('es-CO')}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {kanbanError && viewMode === 'kanban' && (
        <div className="mx-4 md:mx-6 mt-4 p-3 rounded-xl text-sm flex items-center gap-2"
          style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {kanbanError}
          <button onClick={fetchKanban} className="underline hover:no-underline ml-1">Reintentar</button>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'kanban' ? (
          <div className="h-full px-4 md:px-6 pt-5 pb-6">
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
          <div className="px-4 md:px-6 pt-5 pb-8">
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
