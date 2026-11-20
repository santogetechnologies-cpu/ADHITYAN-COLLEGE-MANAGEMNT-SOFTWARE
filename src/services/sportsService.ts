import { supabase } from '@/lib/supabase';

const sb: any = supabase;
const fail = (e: any): never => { throw new Error(e?.message || 'Request failed'); };

export interface SportsEvent { id: string; name: string; sport: string; date: string; status: string; participants: number; teams: number }
export interface SportsTeam { id: string; sport: string; category: string; captain: string; coach: string; members_count: number; achievements: string[] }

export const sportsService = {
  async events(): Promise<SportsEvent[]> { const { data, error } = await sb.from('sports_events').select('*').order('date', { ascending: false }); if (error) fail(error); return data || []; },
  async saveEvent(e: Partial<SportsEvent> & { name: string; sport: string; date: string }): Promise<void> {
    const { id, ...row } = e as any;
    const { error } = id ? await sb.from('sports_events').update(row).eq('id', id) : await sb.from('sports_events').insert(row);
    if (error) fail(error);
  },
  async deleteEvent(id: string): Promise<void> { const { error } = await sb.from('sports_events').delete().eq('id', id); if (error) fail(error); },
  async teams(): Promise<SportsTeam[]> { const { data, error } = await sb.from('sports_teams').select('*').order('sport'); if (error) fail(error); return data || []; },
  async saveTeam(t: Partial<SportsTeam> & { sport: string; category: string; captain: string; coach: string }): Promise<void> {
    const { id, ...row } = t as any;
    const { error } = id ? await sb.from('sports_teams').update(row).eq('id', id) : await sb.from('sports_teams').insert(row);
    if (error) fail(error);
  },
  async deleteTeam(id: string): Promise<void> { const { error } = await sb.from('sports_teams').delete().eq('id', id); if (error) fail(error); },
};
