'use server'

import { getSupabase } from '@/lib/supabase';

export async function getShipments() {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching shipments:', error);
        return [];
    }

    return (data as any[]) || [];
}

export async function getLatestTrackingLogs() {
    const supabase = getSupabase();
    if (!supabase) return [];

    // Fetch the latest entry from tracking_logs for each shipment
    const { data, error } = await supabase
        .from('tracking_logs')
        .select(`
      *,
      shipments (
        booking_no,
        main_vessel_name
      )
    `)
        .order('last_sync', { ascending: false });

    if (error) {
        console.error('Error fetching tracking logs:', error);
        return [];
    }

    // Filter to get only the latest log for each shipment_id
    const latestLogsMap = new Map();
    (data as any[])?.forEach((log) => {
        if (!latestLogsMap.has(log.shipment_id)) {
            latestLogsMap.set(log.shipment_id, log);
        }
    });

    return Array.from(latestLogsMap.values());
}

export async function getDashboardStats() {
    const supabase = getSupabase();
    if (!supabase) return { total: 0, inTransit: 0, arrived: 0 };

    const { data: shipments, error } = await supabase
        .from('shipments')
        .select('current_status_step');

    if (error) {
        console.error('Error fetching stats:', error);
        return { total: 0, inTransit: 0, arrived: 0 };
    }

    const shipmentList = (shipments as any[]) || [];
    const stats = {
        total: shipmentList.length,
        inTransit: shipmentList.filter(s => s.current_status_step === 'On Vessel' || s.current_status_step === 'Loading').length,
        arrived: shipmentList.filter(s => s.current_status_step === 'Arrived').length
    };

    return stats;
}
