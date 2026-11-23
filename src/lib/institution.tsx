import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/** The college's name comes from Settings (institutional_settings), never from code. */
const FALLBACK = 'Your Institution';
let cached: string | null = null;
let inflight: Promise<string> | null = null;
const listeners = new Set<(n: string) => void>();

function load(): Promise<string> {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = Promise.resolve((supabase as any).from('institutional_settings').select('institution_name').limit(1).maybeSingle())
      .then((r: any) => { const n = (r?.data?.institution_name || '').trim(); if (n) { cached = n; listeners.forEach(l => l(n)); } return cached ?? FALLBACK; })
      .catch(() => FALLBACK)
      .finally(() => { inflight = null; });
  }
  return inflight;
}

/** Synchronous read for print templates; kicks off a load the first time it is called. */
export function getInstitutionName(): string { if (!cached) void load(); return cached ?? FALLBACK; }
export function setInstitutionName(name: string): void { cached = name.trim() || null; if (cached) listeners.forEach(l => l(cached!)); }

export function useInstitutionName(): string {
  const [name, setName] = useState(cached ?? FALLBACK);
  useEffect(() => { listeners.add(setName); void load().then(setName); return () => { listeners.delete(setName); }; }, []);
  return name;
}

export function InstitutionName() { return <>{useInstitutionName()}</>; }
