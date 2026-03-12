'use client';

import { useReducer, useEffect, useCallback, useRef } from 'react';
import type { CrmLead, CrmStage, CrmUser, CrmStats as CrmStatsType, CrmLeadStatus } from '@/types';
import CrmStats from '@/components/crm/CrmStats';
import KanbanBoard from '@/components/crm/KanbanBoard';
import LeadsTable from '@/components/crm/LeadsTable';
import LeadModal from '@/components/crm/LeadModal';
import PipelineAnalytics from '@/components/crm/PipelineAnalytics';

// ─── State & Reducer ──────────────────────────────────────────────────────────

type ViewMode = 'kanban' | 'list' | 'analytics';
const LIST_LIMIT = 50;

interface CrmState {
  viewMode: ViewMode;
  // Datos compartidos
  stages: CrmStage[];
  users: CrmUser[];
  stats: CrmStatsType | null;
  metaLoading: boolean;
  // Kanban
  kanbanLeads: CrmLead[];
  kanbanLoading: boolean;
  kanbanError: string | null;
  // Lista
  listLeads: CrmLead[];
  listPage: number;
  listTotal: number;
  listPages: number;
  listLoading: boolean;
  listSearch: string;
  listStatus: 'todos' | CrmLeadStatus | 'archivado';
  listOrigin: string;
  listStageId: string;
  // Modal
  selectedLead: CrmLead | null;
  isModalOpen: boolean;
  modalMode: 'view' | 'create';
  defaultStageId: number | undefined;
}

type CrmAction =
  | { type: 'SET_VIEW'; mode: ViewMode }
  | { type: 'META_LOADING' }
  | { type: 'META_LOADED'; stages: CrmStage[]; users: CrmUser[]; stats: CrmStatsType | null }
  | { type: 'KANBAN_LOADING' }
  | { type: 'KANBAN_LOADED'; leads: CrmLead[] }
  | { type: 'KANBAN_ERROR'; error: string }
  | { type: 'KANBAN_UPDATE_LEAD'; leadId: number; stageId: number; stageName: string; stageColor: string }
  | { type: 'LIST_LOADING' }
  | { type: 'LIST_LOADED'; leads: CrmLead[]; page: number; total: number; pages: number }
  | { type: 'LIST_SET_SEARCH'; search: string }
  | { type: 'LIST_SET_STATUS'; status: 'todos' | CrmLeadStatus | 'archivado' }
  | { type: 'LIST_SET_ORIGIN'; origin: string }
  | { type: 'LIST_SET_STAGE'; stageId: string }
  | { type: 'MODAL_OPEN_VIEW'; lead: CrmLead }
  | { type: 'MODAL_OPEN_CREATE'; defaultStageId?: number }
  | { type: 'MODAL_CLOSE' };

const initialState: CrmState = {
  viewMode: 'kanban',
  stages: [], users: [], stats: null, metaLoading: true,
  kanbanLeads: [], kanbanLoading: true, kanbanError: null,
  listLeads: [], listPage: 1, listTotal: 0, listPages: 1, listLoading: false,
  listSearch: '', listStatus: 'todos', listOrigin: '', listStageId: '',
  selectedLead: null, isModalOpen: false, modalMode: 'view', defaultStageId: undefined,
};

function crmReducer(state: CrmState, action: CrmAction): CrmState {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, viewMode: action.mode };

    case 'META_LOADING':
      return { ...state, metaLoading: true };
    case 'META_LOADED':
      return { ...state, metaLoading: false, stages: action.stages, users: action.users, stats: action.stats };

    case 'KANBAN_LOADING':
      return { ...state, kanbanLoading: true, kanbanError: null };
    case 'KANBAN_LOADED':
      return { ...state, kanbanLoading: false, kanbanLeads: action.leads };
    case 'KANBAN_ERROR':
      return { ...state, kanbanLoading: false, kanbanError: action.error };
    case 'KANBAN_UPDATE_LEAD':
      return {
        ...state,
        kanbanLeads: state.kanbanLeads.map((l) =>
          Number(l.Id) === action.leadId
            ? { ...l, Stage_Id: action.stageId, Stage_Nombre: action.stageName, Stage_Color: action.stageColor }
            : l
        ),
      };

    case 'LIST_LOADING':
      return { ...state, listLoading: true };
    case 'LIST_LOADED':
      return { ...state, listLoading: false, listLeads: action.leads, listPage: action.page, listTotal: action.total, listPages: action.pages };
    case 'LIST_SET_SEARCH':
      return { ...state, listSearch: action.search };
    case 'LIST_SET_STATUS':
      return { ...state, listStatus: action.status };
    case 'LIST_SET_ORIGIN':
      return { ...state, listOrigin: action.origin };
    case 'LIST_SET_STAGE':
      return { ...state, listStageId: action.stageId };

    case 'MODAL_OPEN_VIEW':
      return { ...state, isModalOpen: true, modalMode: 'view', selectedLead: action.lead, defaultStageId: undefined };
    case 'MODAL_OPEN_CREATE':
      return { ...state, isModalOpen: true, modalMode: 'create', selectedLead: null, defaultStageId: action.defaultStageId };
    case 'MODAL_CLOSE':
      return { ...state, isModalOpen: false, selectedLead: null };

    default:
      return state;
  }
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function CrmPage() {
  const [state, dispatch] = useReducer(crmReducer, initialState);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { viewMode, stages, users, stats, metaLoading,
          kanbanLeads, kanbanLoading, kanbanError,
          listLeads, listPage, listTotal, listPages, listLoading,
          listSearch, listStatus, listOrigin, listStageId,
          selectedLead, isModalOpen, modalMode, defaultStageId } = state;

  // ── Fetchers ──────────────────────────────────────────────────────────────

  const fetchMeta = useCallback(async () => {
    dispatch({ type: 'META_LOADING' });
    try {
      const [sr, ur, str] = await Promise.all([
        fetch('/api/crm/stages'),
        fetch('/api/crm/users'),
        fetch('/api/crm/stats'),
      ]);
      const [sd, ud, std] = await Promise.all([sr.json(), ur.json(), str.json()]);
      dispatch({
        type: 'META_LOADED',
        stages: sd.success  ? (sd.data  ?? []) : [],
        users:  ud.success  ? (ud.data  ?? []) : [],
        stats:  std.success ? (std.data ?? null) : null,
      });
    } catch (e) {
      console.error('[crm] fetchMeta error:', e);
      dispatch({ type: 'META_LOADED', stages: [], users: [], stats: null });
    }
  }, []);

  const fetchKanban = useCallback(async () => {
    dispatch({ type: 'KANBAN_LOADING' });
    try {
      const res  = await fetch('/api/crm/leads?limit=500');
      const data = await res.json();
      if (data.success) dispatch({ type: 'KANBAN_LOADED', leads: data.data ?? [] });
      else dispatch({ type: 'KANBAN_ERROR', error: data.error || 'Error al cargar Kanban' });
    } catch (e) {
      dispatch({ type: 'KANBAN_ERROR', error: e instanceof Error ? e.message : 'Error al cargar datos' });
    }
  }, []);

  const fetchList = useCallback(async (
    page: number, search: string, status: string, origin: string, stageId: string,
  ) => {
    dispatch({ type: 'LIST_LOADING' });
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
        dispatch({ type: 'LIST_LOADED', leads: data.data ?? [], page, total: data.total ?? 0, pages: data.pages ?? 1 });
      }
    } catch (e) {
      console.error('[crm] fetchList error:', e);
      dispatch({ type: 'LIST_LOADED', leads: [], page: 1, total: 0, pages: 1 });
    }
  }, []);

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchMeta();
    fetchKanban();
  }, [fetchMeta, fetchKanban]);

  // Solo carga la lista al cambiar a vista lista — los filtros se manejan en sus propios handlers
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (viewMode === 'list') fetchList(1, listSearch, listStatus, listOrigin, listStageId);
  }, [viewMode]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleListSearch = useCallback((v: string) => {
    dispatch({ type: 'LIST_SET_SEARCH', search: v });
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchList(1, v, listStatus, listOrigin, listStageId);
    }, 400);
  }, [fetchList, listStatus, listOrigin, listStageId]);

  const handleListStatus = useCallback((v: 'todos' | CrmLeadStatus | 'archivado') => {
    dispatch({ type: 'LIST_SET_STATUS', status: v });
    fetchList(1, listSearch, v, listOrigin, listStageId);
  }, [fetchList, listSearch, listOrigin, listStageId]);

  const handleListOrigin = useCallback((v: string) => {
    dispatch({ type: 'LIST_SET_ORIGIN', origin: v });
    fetchList(1, listSearch, listStatus, v, listStageId);
  }, [fetchList, listSearch, listStatus, listStageId]);

  const handleListStageId = useCallback((v: string) => {
    dispatch({ type: 'LIST_SET_STAGE', stageId: v });
    fetchList(1, listSearch, listStatus, listOrigin, v);
  }, [fetchList, listSearch, listStatus, listOrigin]);

  const handleListPageChange = useCallback((page: number) => {
    fetchList(page, listSearch, listStatus, listOrigin, listStageId);
  }, [fetchList, listSearch, listStatus, listOrigin, listStageId]);

  const handleStageDrop = useCallback(async (leadId: number, newStageId: number) => {
    const stage = stages.find((s) => Number(s.Id) === Number(newStageId));
    if (!stage) return;
    dispatch({ type: 'KANBAN_UPDATE_LEAD', leadId, stageId: newStageId, stageName: stage.Nombre, stageColor: stage.Color });
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
    dispatch({ type: 'LIST_SET_STAGE', stageId: sid });
    dispatch({ type: 'LIST_SET_SEARCH', search: '' });
    dispatch({ type: 'LIST_SET_STATUS', status: 'todos' });
    dispatch({ type: 'LIST_SET_ORIGIN', origin: '' });
    dispatch({ type: 'SET_VIEW', mode: 'list' });
    fetchList(1, '', 'todos', '', sid);
  }, [fetchList]);

  const handleLeadClick   = useCallback((lead: CrmLead) => {
    dispatch({ type: 'MODAL_OPEN_VIEW', lead });
  }, []);

  const handleAddLead     = useCallback((stageId?: number) => {
    dispatch({ type: 'MODAL_OPEN_CREATE', defaultStageId: stageId });
  }, []);

  const handleModalClose  = useCallback(() => {
    dispatch({ type: 'MODAL_CLOSE' });
  }, []);

  const handleModalSave   = useCallback(async () => {
    dispatch({ type: 'MODAL_CLOSE' });
    fetchMeta();
    fetchKanban();
    if (viewMode === 'list') fetchList(listPage, listSearch, listStatus, listOrigin, listStageId);
  }, [fetchMeta, fetchKanban, fetchList, viewMode, listPage, listSearch, listStatus, listOrigin, listStageId]);

  // ── Render ────────────────────────────────────────────────────────────────

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
          <button onClick={() => handleAddLead()} className="btn btn-success">
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
          <button onClick={() => dispatch({ type: 'SET_VIEW', mode: 'kanban' })} className={`tab-item ${viewMode === 'kanban' ? 'active' : ''}`}>
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
          <button onClick={() => dispatch({ type: 'SET_VIEW', mode: 'list' })} className={`tab-item ${viewMode === 'list' ? 'active' : ''}`}>
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
          <button onClick={() => dispatch({ type: 'SET_VIEW', mode: 'analytics' })} className={`tab-item ${viewMode === 'analytics' ? 'active' : ''}`}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            Analytics
          </button>
        </div>
      </div>

      {/* ── Error Kanban ── */}
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
        ) : viewMode === 'list' ? (
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
        ) : (
          <div className="px-4 md:px-6 pt-5 pb-8">
            <PipelineAnalytics stats={stats} loading={metaLoading} />
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
