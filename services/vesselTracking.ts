import axios from 'axios';
import { getSupabaseService } from '@/lib/supabase';

export interface VesselTrackingData {
    MMSI: string;
    LATITUDE: number;
    LONGITUDE: number;
    SPEED: number;
    COURSE: number;
    HEADING: number;
    TIMESTAMP: string;
    NAME: string;
    IMO: string;
    AIS_TYPE_SUMMARY?: string;
}

export interface VesselMmsiResult {
    mmsi: string | null;
    imo?: string | null;
    carrierScac?: string;
    shipType?: string;
    fromCache?: boolean;
}

// Hardcoded vessel data for known ships (to avoid API calls)
const HARDCODED_VESSELS: Record<string, { mmsi: string; carrierScac?: string; imo?: string }> = {
    'HMM HOPE': { mmsi: '440176000', carrierScac: 'HDMU' },
    'MSC OSCAR': { mmsi: '355906000', carrierScac: 'MSCU', imo: '9703291' },
    'EVER WEB': { mmsi: '563237400', carrierScac: 'EGLV' },
};

// Ship types to filter for cargo vessels
const CARGO_SHIP_TYPES = ['Cargo', 'Container Ship', 'Cargo - Hazard A (Major)', 'Cargo - Hazard B'];

/**
 * Get MMSI for a vessel by name using smart search logic:
 * 1. Check hardcoded references
 * 2. Check vessel_master cache table
 * 3. Call VesselFinder1 /search API
 * 4. Filter for Cargo/Container Ship types
 * 5. Save to vessel_master cache
 * 
 * @param vesselName - The name of the vessel to search for
 * @returns VesselMmsiResult with mmsi, imo, and optional carrier info
 */
export const getVesselMmsi = async (vesselName: string): Promise<VesselMmsiResult> => {
    const normalizedName = vesselName.trim().toUpperCase();

    // Step 0: Check hardcoded references first
    const hardcoded = HARDCODED_VESSELS[normalizedName];
    if (hardcoded) {
        console.log(`[getVesselMmsi] Found hardcoded MMSI for ${normalizedName}: ${hardcoded.mmsi}`);
        return {
            mmsi: hardcoded.mmsi,
            imo: hardcoded.imo || null,
            carrierScac: hardcoded.carrierScac,
            fromCache: true,
        };
    }

    // Step 1: Check vessel_master cache table
    const supabase = getSupabaseService();
    if (supabase) {
        try {
            const { data: cachedVessel, error } = await supabase
                .from('vessel_master')
                .select('mmsi, imo, ship_type')
                .eq('vessel_name', normalizedName)
                .single();

            if (!error && cachedVessel) {
                console.log(`[getVesselMmsi] Cache hit for ${normalizedName}: ${cachedVessel.mmsi}`);
                return {
                    mmsi: cachedVessel.mmsi,
                    imo: cachedVessel.imo,
                    shipType: cachedVessel.ship_type,
                    fromCache: true,
                };
            }
        } catch (err) {
            console.warn('[getVesselMmsi] Cache lookup failed:', err);
        }
    }

    // Step 2: Call VesselFinder1 /search API with vessel name
    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
        console.error('[getVesselMmsi] RAPIDAPI_KEY is missing');
        return { mmsi: null };
    }

    const options = {
        method: 'GET',
        url: 'https://vesselfinder1.p.rapidapi.com/search',
        params: { name: vesselName },
        headers: {
            'x-rapidapi-key': apiKey,
            'x-rapidapi-host': 'vesselfinder1.p.rapidapi.com'
        }
    };

    try {
        console.log(`[getVesselMmsi] Calling VesselFinder1 API for: ${vesselName}`);
        const response = await axios.request(options);
        const results = response.data;

        if (!results || (Array.isArray(results) && results.length === 0)) {
            console.log(`[getVesselMmsi] No results found for: ${vesselName}`);
            return { mmsi: null };
        }

        // Step 3: Filter for Cargo/Container Ship types
        const vessels = Array.isArray(results) ? results : [results];

        let selectedVessel = vessels.find((v: VesselTrackingData) =>
            v.AIS_TYPE_SUMMARY && CARGO_SHIP_TYPES.some(type =>
                v.AIS_TYPE_SUMMARY?.toLowerCase().includes(type.toLowerCase())
            )
        );

        // If no cargo vessel found, use the first result
        if (!selectedVessel && vessels.length > 0) {
            selectedVessel = vessels[0];
            console.log(`[getVesselMmsi] No cargo vessel found, using first result`);
        }

        if (!selectedVessel || !selectedVessel.MMSI) {
            console.log(`[getVesselMmsi] No valid vessel found for: ${vesselName}`);
            return { mmsi: null };
        }

        console.log(`[getVesselMmsi] Found vessel: ${selectedVessel.NAME}, MMSI: ${selectedVessel.MMSI}, Type: ${selectedVessel.AIS_TYPE_SUMMARY}`);

        // Step 4: Save to vessel_master cache
        if (supabase) {
            try {
                await supabase.from('vessel_master').upsert({
                    vessel_name: normalizedName,
                    mmsi: selectedVessel.MMSI,
                    imo: selectedVessel.IMO || null,
                    ship_type: selectedVessel.AIS_TYPE_SUMMARY || null,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'vessel_name' });
                console.log(`[getVesselMmsi] Cached MMSI for ${normalizedName}`);
            } catch (err) {
                console.warn('[getVesselMmsi] Failed to cache vessel:', err);
            }
        }

        return {
            mmsi: selectedVessel.MMSI,
            imo: selectedVessel.IMO || null,
            shipType: selectedVessel.AIS_TYPE_SUMMARY,
            fromCache: false,
        };

    } catch (error) {
        console.error(`[getVesselMmsi] Error searching for vessel ${vesselName}:`, error);
        return { mmsi: null };
    }
};

export const fetchVesselData = async (mmsi: string): Promise<VesselTrackingData | null> => {
    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
        console.error('RAPIDAPI_KEY is missing');
        return null;
    }

    const options = {
        method: 'GET',
        url: 'https://vesselfinder1.p.rapidapi.com/search',
        params: { mmsi },
        headers: {
            'x-rapidapi-key': apiKey,
            'x-rapidapi-host': 'vesselfinder1.p.rapidapi.com'
        }
    };

    try {
        const response = await axios.request(options);
        // Note: The API response might be an array or a single object depending on the search result.
        // Based on research, it usually returns the data directly or in a results array.
        const data = response.data;

        if (Array.isArray(data) && data.length > 0) {
            return data[0];
        } else if (data && data.MMSI) {
            return data;
        }

        return null;
    } catch (error) {
        console.error(`Error fetching vessel data for MMSI ${mmsi}:`, error);
        return null;
    }
};
