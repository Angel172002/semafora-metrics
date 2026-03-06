'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DashboardData, DateRange } from '@/types';

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/metrics?range=${range}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        throw new Error(json.error || 'Error desconocido');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar métricas');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const triggerSync = useCallback(async () => {
    setSyncing(true);
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platforms: ['meta', 'google', 'tiktok'], days: 30 }),
      });
      // Refetch after sync
      await fetchData();
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      setSyncing(false);
    }
  }, [fetchData]);

  return { data, loading, syncing, error, refresh: fetchData, triggerSync };
}
