import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { fetchVesselData } from '@/services/vesselTracking';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    try {
        const supabase = getSupabaseService();

        if (!supabase) {
            return NextResponse.json({ error: 'Supabase service role key is missing' }, { status: 500 });
        }

        // 1. Fetch all shipments that have an MMSI
        const { data: shipments, error: fetchError } = await (supabase as any)
            .from('shipments')
            .select('id, mmsi, booking_no')
            .not('mmsi', 'is', null);

        if (fetchError) {
            throw fetchError;
        }

        if (!shipments || shipments.length === 0) {
            return NextResponse.json({ message: 'No shipments with MMSI found' }, { status: 200 });
        }

        const results = [];

        // 2. Loop through shipments and fetch tracking data
        for (const shipment of shipments) {
            const trackingData = await fetchVesselData(shipment.mmsi);

            if (trackingData) {
                // 3. Insert into tracking_logs
                const { error: insertError } = await (supabase as any)
                    .from('tracking_logs')
                    .insert({
                        shipment_id: shipment.id,
                        latitude: trackingData.LATITUDE,
                        longitude: trackingData.LONGITUDE,
                        status_text: `Speed: ${trackingData.SPEED} kn, Course: ${trackingData.COURSE}°`,
                        last_sync: new Date().toISOString()
                    });

                if (insertError) {
                    results.push({ booking_no: shipment.booking_no, status: 'error', message: insertError.message });
                } else {
                    results.push({ booking_no: shipment.booking_no, status: 'success' });
                }
            } else {
                results.push({ booking_no: shipment.booking_no, status: 'skipped', message: 'No data from API' });
            }
        }

        return NextResponse.json({
            summary: 'Sync process completed',
            details: results
        }, { status: 200 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
    }
}
