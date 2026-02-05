// Shared TypeScript interfaces for the Vesselradar application

export interface Shipment {
    id: string;
    booking_no: string;
    main_vessel_name: string;
    voyage_no: string;
    carrier_name?: string;
    current_status_step: string;
    shipper_name?: string;
    consignee_name?: string;
    agent_company?: string;
    port_of_loading?: string;
    final_destination?: string;
    pod_name: string;
    etd_at_pol?: string;
    eta_at_pod: string;
    mmsi?: string;
    imo?: string;
    origin?: string;
    place_of_receipt?: string;
}

export interface TrackingLog {
    id: string;
    shipment_id: string;
    latitude: number;
    longitude: number;
    status: string;
    speed_knots: number;
    course: number;
    vessel_name: string;
    mmsi: string;
    flag: string;
    last_sync: string;
    shipments?: {
        booking_no: string;
        main_vessel_name: string;
    };
}

export interface DashboardStats {
    total: number;
    inTransit: number;
    arrived: number;
}

export interface SelectedVessel {
    id: string;
    name: string;
    status: string;
    scheduledDate: string;
    statusTag: string;
    latitude: number;
    longitude: number;
    bookingNo: string;
    mmsi?: string;
    flag?: string;
    speed?: number | null;
}
