import { useEffect, useRef } from 'react';
import { supabase } from '@/services/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface RealtimeSubscriptionOptions<T extends { [key: string]: any }> {
  table: string;
  schema?: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  enabled?: boolean;
  onInsert?: (payload: RealtimePostgresChangesPayload<T>) => void;
  onUpdate?: (payload: RealtimePostgresChangesPayload<T>) => void;
  onDelete?: (payload: RealtimePostgresChangesPayload<T>) => void;
  onChange?: (payload: RealtimePostgresChangesPayload<T>) => void;
  onReconnect?: () => void;
}

/**
 * Robust Supabase Realtime Postgres Changes Hook
 * - Prevents duplicate channels and memory leaks
 * - Stable ref-based callbacks so parent re-renders don't cause teardown/reconnect churn
 * - Automatic reconnection handling & authoritative re-sync
 */
export function useRealtimeSubscription<T extends { [key: string]: any }>(
  tableOrOptions: string | RealtimeSubscriptionOptions<T>,
  legacyOnInsert?: (payload: RealtimePostgresChangesPayload<T>) => void,
  legacyOnUpdate?: (payload: RealtimePostgresChangesPayload<T>) => void,
  legacyOnDelete?: (payload: RealtimePostgresChangesPayload<T>) => void,
  legacyFilter?: string
) {
  // Normalize options to support both object syntax and legacy positional parameters
  const options: RealtimeSubscriptionOptions<T> = typeof tableOrOptions === 'string'
    ? {
        table: tableOrOptions,
        filter: legacyFilter,
        onInsert: legacyOnInsert,
        onUpdate: legacyOnUpdate,
        onDelete: legacyOnDelete,
      }
    : tableOrOptions;

  const {
    table,
    schema = 'public',
    filter,
    event = '*',
    enabled = true,
    onInsert,
    onUpdate,
    onDelete,
    onChange,
    onReconnect,
  } = options;

  // Keep references to latest callbacks to avoid re-subscribing on every callback definition change
  const onInsertRef = useRef(onInsert);
  const onUpdateRef = useRef(onUpdate);
  const onDeleteRef = useRef(onDelete);
  const onChangeRef = useRef(onChange);
  const onReconnectRef = useRef(onReconnect);

  useEffect(() => {
    onInsertRef.current = onInsert;
    onUpdateRef.current = onUpdate;
    onDeleteRef.current = onDelete;
    onChangeRef.current = onChange;
    onReconnectRef.current = onReconnect;
  });

  useEffect(() => {
    if (!enabled || !table) return;

    let hasInitiallySubscribed = false;
    const channelName = `realtime-${table}-${filter ? filter.replace(/[^a-zA-Z0-9]/g, '_') : 'all'}-${Math.random().toString(36).substring(2, 7)}`;

    const channel = supabase.channel(channelName);

    channel
      .on(
        'postgres_changes',
        {
          event,
          schema,
          table,
          filter,
        },
        (payload: RealtimePostgresChangesPayload<T>) => {
          if (onChangeRef.current) {
            onChangeRef.current(payload);
          }
          if (payload.eventType === 'INSERT' && onInsertRef.current) {
            onInsertRef.current(payload);
          } else if (payload.eventType === 'UPDATE' && onUpdateRef.current) {
            onUpdateRef.current(payload);
          } else if (payload.eventType === 'DELETE' && onDeleteRef.current) {
            onDeleteRef.current(payload);
          }
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.warn(`[Realtime ${table}] subscription error:`, err);
        }
        if (status === 'SUBSCRIBED') {
          if (hasInitiallySubscribed && onReconnectRef.current) {
            // Reconnected after a network disconnect or wake-from-sleep
            onReconnectRef.current();
          }
          hasInitiallySubscribed = true;
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, schema, filter, event, enabled]);
}
