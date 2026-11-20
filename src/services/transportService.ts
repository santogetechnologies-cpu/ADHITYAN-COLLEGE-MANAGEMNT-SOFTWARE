import { supabase } from '@/lib/supabase';
import { handleSupabaseError } from './api/errors';

export interface TransportVehicleItem {
  id: string;
  vehicle_number: string;
  route_name: string;
  driver_name?: string;
  driver_phone?: string;
  capacity?: number;
  status: 'active' | 'in_transit' | 'maintenance' | 'inactive';
  current_location?: string;
  last_updated?: string;
}

export interface TransportStopItem {
  id: string;
  vehicle_id: string;
  stop_name: string;
  sequence_order: number;
  morning_pickup_time?: string;
  evening_drop_time?: string;
}

export interface StudentTransportLogItem {
  id: string;
  student_id: string;
  student_name?: string;
  vehicle_id: string;
  trip_type: 'morning_pickup' | 'evening_drop';
  status: 'boarded' | 'dropped' | 'absent';
  timestamp: string;
}

export const transportService = {
  async listVehicles(): Promise<TransportVehicleItem[]> {
    try {
      const { data, error } = await supabase
        .from('transport_vehicles')
        .select('*')
        .order('vehicle_number', { ascending: true });

      if (error) throw error;
      return (data || []).map((v: any) => ({
        id: v.id,
        vehicle_number: v.vehicle_number,
        route_name: v.route_name,
        driver_name: v.driver_name,
        driver_phone: v.driver_phone,
        capacity: v.capacity || 40,
        status: v.status || 'active',
        current_location: v.current_location || 'Campus Bus Bay',
        last_updated: v.updated_at,
      }));
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to fetch transport fleet');
    }
  },

  async updateVehicleStatus(id: string, updates: { status?: string; current_location?: string }): Promise<void> {
    try {
      const { error } = await supabase
        .from('transport_vehicles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to update vehicle live status');
    }
  },

  async listStops(vehicleId?: string): Promise<TransportStopItem[]> {
    try {
      let query = supabase
        .from('transport_stops')
        .select('*')
        .order('stop_order', { ascending: true });

      if (vehicleId) {
        query = query.eq('vehicle_id', vehicleId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((s: any) => ({
        id: s.id,
        vehicle_id: s.vehicle_id,
        stop_name: s.stop_name,
        sequence_order: s.stop_order ?? s.sequence_order ?? 1,
        morning_pickup_time: s.scheduled_time || s.morning_pickup_time || '07:30 AM',
        evening_drop_time: s.evening_drop_time || '05:00 PM',
      }));
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to load route stops');
    }
  },

  async logStudentBoarding(studentId: string, vehicleId: string, tripType: 'morning_pickup' | 'evening_drop', status: 'boarded' | 'dropped'): Promise<void> {
    try {
      const { error } = await supabase
        .from('student_transport_logs')
        .insert({
          student_id: studentId,
          vehicle_id: vehicleId,
          trip_type: tripType,
          status,
        });

      if (error) throw error;
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to log student transit check-in');
    }
  },
};

export default transportService;

