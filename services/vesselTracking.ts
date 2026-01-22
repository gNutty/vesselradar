import axios from 'axios';

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
}

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
