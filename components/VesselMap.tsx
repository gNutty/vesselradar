'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Ship } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

// Fix for default marker icons in Leaflet
const customShipIcon = L.divIcon({
    html: renderToStaticMarkup(
        <div className="bg-accent-blue p-2 rounded-full shadow-lg border-2 border-white/20 text-navy-dark">
            <Ship size={16} />
        </div>
    ),
    className: 'custom-ship-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
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

export default function VesselMap({ logs }: { logs: any[] }) {
    // Default center if no logs: Southeast Asia (near Laem Chabang)
    const defaultCenter: [number, number] = [13.048, 100.897];

    return (
        <div className="glass-card rounded-2xl overflow-hidden h-[500px] mb-8 relative z-0">
            <div className="absolute top-4 left-4 z-[1000] glass-card px-4 py-2 rounded-lg pointer-events-none">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fleet Overview</p>
                <p className="text-sm font-bold text-white">Live Vessel Positions</p>
            </div>

            <MapContainer
                center={logs.length > 0 ? [logs[0].latitude, logs[0].longitude] : defaultCenter}
                zoom={5}
                scrollWheelZoom={false}
                className="h-full w-full"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
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
      `}</style>
        </div>
    );
}
