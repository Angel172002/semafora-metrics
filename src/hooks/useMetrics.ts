'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DashboardData, DateRange } from '@/types';
import { useToast } from '@/components/Toast';

interface UseMetricsResult {
  data: DashboardData | null;
  loading: boolean;
  syncing: boolean;
  error: string | null;
  refresh: () => void;
  triggerSync: () => Promise<void>;
}

export function useMetrics(range: DateRange): UseMetricsResult {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/metrics?range=${range}`, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        throw new Error(json.error || 'Error desconocido');
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Error al cargar métricas';
      setError(msg);
      toast.error(`Error al cargar métricas: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [range]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const triggerSync = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platforms: ['meta', 'google', 'tiktok'], days: 30 }),
      });
      const json = await res.json();
      if (json.success) {
        const crmMsg = json.crmLeadsCreated ? ` · ${json.crmLeadsCreated} leads CRM creados` : '';
        toast.success(`Sincronización completa${crmMsg}`);
      } else {
        toast.warning(`Sync parcial: ${json.error || 'Algunos datos no se sincronizaron'}`);
      }
      await fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de conexión';
      toast.error(`Error al sincronizar: ${msg}`);
      console.error('Sync error:', err);
    } finally {
      setSyncing(false);
    }
  }, [fetchData, toast]);

  return { data, loading, syncing, error, refresh: fetchData, triggerSync };
}
