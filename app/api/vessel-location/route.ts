import { NextRequest, NextResponse } from 'next/server';
import { fetchVesselData } from '@/services/vesselTracking';
import { getSupabaseService } from '@/lib/supabase';

// Cache duration in hours
const CACHE_DURATION_HOURS = 6;
const FORCE_REFRESH_MIN_HOURS = 1; // Minimum age before allowing force refresh

// Fallback mock locations for known vessels (when API is unavailable)
const MOCK_VESSEL_LOCATIONS: Record<string, { latitude: number; longitude: number; name: string }> = {
    '440176000': { latitude: 13.048, longitude: 100.897, name: 'HMM HOPE' },     // Near Laem Chabang, Thailand
    '355906000': { latitude: 5.274, longitude: -4.008, name: 'MSC OSCAR' },     // Near Abidjan, Ivory Coast
    '563237400': { latitude: 49.286, longitude: -123.111, name: 'EVER WEB' },   // Near Vancouver, Canada
};

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const mmsi = searchParams.get('mmsi');
    const shipmentId = searchParams.get('shipmentId');
    const forceRefresh = searchParams.get('forceRefresh') === 'true';

    if (!mmsi) {
        return NextResponse.json({ error: 'MMSI is required' }, { status: 400 });
    }

    const supabase = getSupabaseService();

    try {
        // Step 1: Check cache in tracking_logs
        if (supabase && shipmentId) {
            const { data: cachedLog, error: cacheError } = await supabase
                .from('tracking_logs')
                .select('*')
                .eq('shipment_id', shipmentId)
                .order('last_sync', { ascending: false })
                .limit(1)
                .single();

            if (!cacheError && cachedLog) {
                const lastSyncTime = new Date(cachedLog.last_sync).getTime();
                const currentTime = Date.now();
                const hoursSinceSync = (currentTime - lastSyncTime) / (1000 * 60 * 60);

                // Determine threshold based on forceRefresh flag
                const threshold = forceRefresh ? FORCE_REFRESH_MIN_HOURS : CACHE_DURATION_HOURS;

                if (hoursSinceSync < threshold) {
                    const reason = forceRefresh
                        ? `Too recent to force refresh (min ${FORCE_REFRESH_MIN_HOURS}h required)`
                        : 'Cache hit';
                    console.log(`[vessel-location] ${reason} for MMSI ${mmsi} (${hoursSinceSync.toFixed(1)}h old)`);
                    return NextResponse.json({
                        mmsi,
                        latitude: cachedLog.latitude,
                        longitude: cachedLog.longitude,
                        statusText: cachedLog.status_text,
                        lastSync: cachedLog.last_sync,
                        source: 'cache',
                        cacheAge: `${hoursSinceSync.toFixed(1)} hours`,
                        message: forceRefresh ? `Data is only ${hoursSinceSync.toFixed(1)}h old. Minimum ${FORCE_REFRESH_MIN_HOURS}h required for refresh.` : undefined,
                    });
                }
                console.log(`[vessel-location] Cache expired for MMSI ${mmsi} (${hoursSinceSync.toFixed(1)}h old)`);
            }
        }

        // Step 2: Fetch fresh data from RapidAPI
        console.log(`[vessel-location] Fetching fresh data from API for MMSI ${mmsi}${forceRefresh ? ' (forced)' : ''}`);
        const vesselData = await fetchVesselData(mmsi);

        if (vesselData) {
            // Step 3: Save to tracking_logs
            if (supabase && shipmentId) {
                const { error: insertError } = await supabase
                    .from('tracking_logs')
                    .insert({
                        shipment_id: shipmentId,
                        latitude: vesselData.latitude,
                        longitude: vesselData.longitude,
                        vessel_name: vesselData.vesselName,
                        mmsi: vesselData.mmsi,
                        imo: vesselData.imo,
                        flag: vesselData.flag,
                        call_sign: vesselData.callSign,
                        vessel_type: vesselData.vesselType,
                        length: vesselData.length,
                        beam: vesselData.beam,
                        draught: vesselData.draught,
                        area: vesselData.area,
                        speed_knots: vesselData.speedKnots,
                        course: vesselData.course,
                        status: vesselData.status,
                        previous_port: vesselData.previousPort,
                        current_port: vesselData.currentPort,
                        next_port: vesselData.nextPort,
                        api_updated_at: vesselData.updatedAt,
                        last_sync: new Date().toISOString(),
                    });

                if (insertError) {
                    console.warn('[vessel-location] Failed to save tracking log:', insertError.message);
                } else {
                    console.log(`[vessel-location] Saved new tracking log for shipment ${shipmentId}`);
                }
            }

            return NextResponse.json({
                mmsi: vesselData.mmsi,
                name: vesselData.vesselName,
                latitude: vesselData.latitude,
                longitude: vesselData.longitude,
                speed: vesselData.speedKnots,
                course: vesselData.course,
                timestamp: vesselData.updatedAt,
                imo: vesselData.imo,
                flag: vesselData.flag,
                status: vesselData.status,
                source: forceRefresh ? 'api-forced' : 'api',
            });
        }

        // Fallback to mock data if API fails
        const mockData = MOCK_VESSEL_LOCATIONS[mmsi];
        if (mockData) {
            console.log(`[vessel-location] Using mock data for MMSI ${mmsi}`);
            return NextResponse.json({
                mmsi,
                name: mockData.name,
                latitude: mockData.latitude,
                longitude: mockData.longitude,
                source: 'mock',
            });
        }

        return NextResponse.json({ error: 'Vessel not found' }, { status: 404 });
    } catch (error) {
        console.error('Error fetching vessel location:', error);

        // Fallback to mock data on error
        const mockData = MOCK_VESSEL_LOCATIONS[mmsi];
        if (mockData) {
            console.log(`[vessel-location] API error, using mock data for MMSI ${mmsi}`);
            return NextResponse.json({
                mmsi,
                name: mockData.name,
                latitude: mockData.latitude,
                longitude: mockData.longitude,
                source: 'mock',
            });
        }

        return NextResponse.json({ error: 'Failed to fetch vessel location' }, { status: 500 });
    }
}

