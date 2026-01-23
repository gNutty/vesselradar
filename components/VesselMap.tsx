'use client'

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Ship, MapPin } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

// Fix for default marker icons in Leaflet - using inline styles because divIcon renders to static HTML
const customShipIcon = L.divIcon({
    html: renderToStaticMarkup(
        <div style={{
            backgroundColor: '#00D9FF',
            padding: '8px',
            borderRadius: '50%',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <Ship size={16} style={{ color: '#0A1628' }} />
        </div>
    ),
    className: 'custom-ship-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
});

// Selected vessel icon (different style) - green with pulse animation
const selectedVesselIcon = L.divIcon({
    html: renderToStaticMarkup(
        <div style={{
            backgroundColor: '#22C55E',
            padding: '12px',
            borderRadius: '50%',
            boxShadow: '0 4px 12px rgba(34, 197, 94, 0.5)',
            border: '3px solid white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <Ship size={20} style={{ color: 'white' }} />
        </div>
    ),
    className: 'selected-ship-icon',
    iconSize: [46, 46],
    iconAnchor: [23, 23],
});

interface TrackingLog {
    id: string;
    shipment_id: string;
    latitude: number;
    longitude: number;
    status_text: string;
    shipments: {
        booking_no: string;
        main_vessel_name: string;
    };
}

interface SelectedVessel {
    id: string;
    name: string;
    status: string;
    scheduledDate: string;
    statusTag: string;
    latitude: number;
    longitude: number;
    bookingNo: string;
}

interface VesselMapProps {
    logs: any[];
    selectedVessel?: SelectedVessel | null;
}

// Component to handle map fly animation
function MapFlyTo({ selectedVessel }: { selectedVessel: SelectedVessel | null }) {
    const map = useMap();

    useEffect(() => {
        if (selectedVessel) {
            map.flyTo([selectedVessel.latitude, selectedVessel.longitude], 8, {
                duration: 1.5
            });
        }
    }, [selectedVessel, map]);

    return null;
}

export default function VesselMap({ logs, selectedVessel }: VesselMapProps) {
    // Default center if no logs: Southeast Asia (near Laem Chabang)
    const defaultCenter: [number, number] = [13.048, 100.897];

    return (
        <div className="glass-card rounded-2xl overflow-hidden h-[500px] mb-8 relative z-0">
            <div className="absolute top-4 left-4 z-[1000] glass-card px-4 py-2 rounded-lg pointer-events-none">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fleet Overview</p>
                <p className="text-sm font-bold text-white">Live Vessel Positions</p>
            </div>

            {/* Show selected vessel info */}
            {selectedVessel && (
                <div className="absolute top-4 right-4 z-[1000] glass-card px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/30">
                    <p className="text-xs font-bold text-green-400 uppercase tracking-widest">Selected Vessel</p>
                    <p className="text-sm font-bold text-white">{selectedVessel.name}</p>
                    <p className="text-xs text-slate-400">Booking: {selectedVessel.bookingNo}</p>
                </div>
            )}

            <MapContainer
                center={logs.length > 0 ? [logs[0].latitude, logs[0].longitude] : defaultCenter}
                zoom={5}
                scrollWheelZoom={true}
                className="h-full w-full"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                {/* Fly to selected vessel */}
                <MapFlyTo selectedVessel={selectedVessel || null} />

                {/* Render logs markers */}
                {logs.map((log) => (
                    <Marker
                        key={log.id}
                        position={[log.latitude, log.longitude]}
                        icon={customShipIcon}
                    >
                        <Popup>
                            <div className="p-1">
                                <p className="font-bold text-navy-dark mb-0.5">{log.shipments?.main_vessel_name}</p>
                                <p className="text-xs text-slate-500 mb-2">Booking: {log.shipments?.booking_no}</p>
                                <div className="border-t border-slate-100 pt-2 text-[10px] text-slate-400">
                                    <p>STATUS: {log.status_text}</p>
                                    <p>COORDS: {log.latitude.toFixed(4)}, {log.longitude.toFixed(4)}</p>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* Render selected vessel marker */}
                {selectedVessel && (
                    <Marker
                        position={[selectedVessel.latitude, selectedVessel.longitude]}
                        icon={selectedVesselIcon}
                    >
                        <Popup>
                            <div className="p-1">
                                <p className="font-bold text-green-600 mb-0.5">{selectedVessel.name}</p>
                                <p className="text-xs text-slate-500 mb-2">Booking: {selectedVessel.bookingNo}</p>
                                <div className="border-t border-slate-100 pt-2 text-[10px] text-slate-400">
                                    <p>STATUS: {selectedVessel.status}</p>
                                    <p>SCHEDULED: {selectedVessel.scheduledDate}</p>
                                    <p>COORDS: {selectedVessel.latitude.toFixed(4)}, {selectedVessel.longitude.toFixed(4)}</p>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                )}
            </MapContainer>

            <style jsx global>{`
        .leaflet-container {
          background: #0f172a !important;
        }
        .leaflet-popup-content-wrapper {
          background: white;
          border-radius: 8px;
          padding: 0;
        }
        .leaflet-popup-content {
          margin: 12px;
        }
        /* Override Leaflet default marker icon background */
        .custom-ship-icon,
        .selected-ship-icon {
          background: transparent !important;
          border: none !important;
        }
        /* Pulse animation using box-shadow instead of transform to avoid conflict with Leaflet positioning */
        .selected-ship-icon > div {
          animation: pulse-glow 2s infinite;
        }
        @keyframes pulse-glow {
          0%, 100% { 
            box-shadow: 0 4px 12px rgba(34, 197, 94, 0.5);
          }
          50% { 
            box-shadow: 0 4px 20px rgba(34, 197, 94, 0.8), 0 0 30px rgba(34, 197, 94, 0.4);
          }
        }
      `}</style>
        </div>
    );
}

