'use client'

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import StatsCards from '@/components/StatsCards';
import ShipmentTable from '@/components/ShipmentTable';
import { Bell, Search, User, RefreshCw } from 'lucide-react';

// Dynamically import the map to avoid SSR issues with Leaflet
const VesselMap = dynamic(() => import('@/components/VesselMap'), {
    ssr: false,
    loading: () => <div className="glass-card rounded-2xl h-[500px] mb-8 animate-pulse bg-white/5" />
});

// Interface for the selected vessel state
interface SelectedVessel {
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

interface DashboardClientProps {
    shipments: any[];
    logs: any[];
    stats: any;
}

export default function DashboardClient({ shipments, logs, stats }: DashboardClientProps) {
    const [selectedVessel, setSelectedVessel] = useState<SelectedVessel | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Filter shipments based on search term
    const filteredShipments = shipments.filter(ship =>
        ship.booking_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ship.main_vessel_name.toLowerCase().includes(searchTerm.toLowerCase())
    );



    // Fallback port coordinates when no tracking log exists
    const portCoordinates: Record<string, { lat: number; lng: number }> = {
        'LAEM CHABANG': { lat: 13.0548, lng: 100.8801 },
        'LCB': { lat: 13.0548, lng: 100.8801 },
        'BANGKOK': { lat: 13.7563, lng: 100.5018 },
        'SINGAPORE': { lat: 1.2644, lng: 103.8225 },
        'HONG KONG': { lat: 22.3193, lng: 114.1694 },
        'BUSAN': { lat: 35.0951, lng: 129.0300 },
        'ROTTERDAM': { lat: 51.9225, lng: 4.4792 },
        'LOS ANGELES': { lat: 33.7366, lng: -118.2923 },
        'LONG BEACH': { lat: 33.7539, lng: -118.2216 },
        'DEFAULT': { lat: 13.048, lng: 100.897 } // Southeast Asia default
    };

    const getPortCoordinates = (portName: string | null | undefined) => {
        if (!portName) return portCoordinates['DEFAULT'];
        const upperPort = portName.toUpperCase();
        for (const [key, coords] of Object.entries(portCoordinates)) {
            if (upperPort.includes(key)) return coords;
        }
        return portCoordinates['DEFAULT'];
    };

    const handleShipmentSelect = (shipment: any) => {
        // Find the latest log for this shipment to get coordinates
        const shipLog = logs.find(log => log.shipment_id === shipment.id);

        let latitude: number;
        let longitude: number;
        let statusTag: string;

        if (shipLog) {
            // Use tracking log coordinates
            latitude = shipLog.latitude;
            longitude = shipLog.longitude;
            statusTag = 'LIVE';
        } else {
            // Fallback: Use port of loading coordinates
            const fallbackCoords = getPortCoordinates(shipment.port_of_loading);
            latitude = fallbackCoords.lat;
            longitude = fallbackCoords.lng;
            statusTag = 'ESTIMATED';
        }

        setSelectedVessel({
            id: shipment.id,
            name: shipment.main_vessel_name,
            status: shipLog?.status || shipment.current_status_step || 'Unknown',
            scheduledDate: shipment.eta_at_pod ? `ETA: ${new Date(shipment.eta_at_pod).toLocaleDateString('en-GB')}` : 'ETA: TBD',
            statusTag,
            latitude,
            longitude,
            bookingNo: shipment.booking_no,
            mmsi: shipment.mmsi || undefined,
            flag: shipLog?.flag,
            speed: shipLog?.speed_knots,
        });
    };

    const handleRefreshLocation = async () => {
        if (!selectedVessel || !selectedVessel.mmsi) {
            console.warn('Cannot refresh: No vessel selected or MMSI missing');
            return;
        }

        setIsRefreshing(true);
        try {
            const response = await fetch(
                `/api/vessel-location?mmsi=${selectedVessel.mmsi}&shipmentId=${selectedVessel.id}&forceRefresh=true`
            );
            const data = await response.json();

            if (response.ok && data.latitude && data.longitude) {
                setSelectedVessel(prev => prev ? {
                    ...prev,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    status: data.status || prev.status,
                    flag: data.flag || prev.flag,
                    speed: data.speed || prev.speed,
                    statusTag: 'LIVE',
                } : null);
                console.log('[DashboardClient] Location refreshed:', data.source);
            } else {
                console.error('[DashboardClient] Refresh failed:', data.error);
            }
        } catch (error) {
            console.error('[DashboardClient] Refresh error:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <div className="flex min-h-screen">
            <Sidebar />

            <main className="flex-1 lg:ml-64 p-8">
                {/* Top Header */}
                <header className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Fleet Dashboard</h1>
                        <p className="text-slate-400">Welcome back, here's what's happening with your shipments.</p>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-accent-blue transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Search Booking ID or Vessel..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-accent-blue/50 focus:bg-white/10 transition-all w-64"
                            />
                        </div>
                        <button className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-colors relative">
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-accent-blue rounded-full border-2 border-navy-dark" />
                        </button>
                        <div className="flex items-center space-x-3 pl-4 border-l border-white/10">
                            <div className="bg-slate-700 w-10 h-10 rounded-full flex items-center justify-center border border-white/20">
                                <User size={20} className="text-slate-300" />
                            </div>
                        </div>
                    </div>
                </header>

                {/* Dashboard Content */}
                <StatsCards stats={stats} />

                <div className="space-y-8">
                    {/* Active Shipments Section (Map + Table) - Full Width */}
                    <div className="w-full">
                        <VesselMap logs={logs} selectedVessel={selectedVessel} />
                        <ShipmentTable
                            shipments={filteredShipments}
                            onShipmentSelect={handleShipmentSelect}
                        />
                    </div>

                    {/* Bottom Section: Route Schedule & Support - 2 Columns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="glass-card p-6 rounded-2xl">
                            <h3 className="font-bold mb-4">Route Schedule</h3>
                            <div className="space-y-3">
                                {selectedVessel ? (
                                    // Show ONLY the selected vessel
                                    <>
                                        <button
                                            key={selectedVessel.id}
                                            className="w-full flex space-x-3 items-start text-left p-3 rounded-xl transition-all duration-200 bg-accent-blue/20 border border-accent-blue/50"
                                        >
                                            <div className="w-1 h-12 rounded-full transition-colors bg-accent-blue" />
                                            <div>
                                                <p className="text-sm font-bold">{selectedVessel.name} - {selectedVessel.status}</p>
                                                <p className="text-xs text-slate-500">{selectedVessel.scheduledDate}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] px-2 py-0.5 bg-green-500/20 text-green-400 rounded uppercase font-bold inline-block">
                                                        {selectedVessel.statusTag}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                        BK: {selectedVessel.bookingNo}
                                                    </span>
                                                </div>
                                            </div>
                                        </button>

                                        {/* Refresh Location Button */}
                                        {selectedVessel.mmsi && (
                                            <button
                                                onClick={handleRefreshLocation}
                                                disabled={isRefreshing}
                                                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl transition-all duration-200 bg-accent-blue/10 border border-accent-blue/30 hover:bg-accent-blue/20 hover:border-accent-blue/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <RefreshCw
                                                    size={14}
                                                    className={`text-accent-blue ${isRefreshing ? 'animate-spin' : ''}`}
                                                />
                                                <span className="text-xs font-semibold text-accent-blue">
                                                    {isRefreshing ? 'Refreshing...' : 'Refresh Location'}
                                                </span>
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    // Show list of top 5 shipments when nothing selected
                                    shipments.slice(0, 5).map((shipment) => {
                                        const hasLog = logs.some(l => l.shipment_id === shipment.id);
                                        return (
                                            <button
                                                key={shipment.id}
                                                onClick={() => handleShipmentSelect(shipment)}
                                                className="w-full flex space-x-3 items-start text-left p-3 rounded-xl transition-all duration-200 hover:bg-white/5 border border-transparent"
                                            >
                                                <div className="w-1 h-12 rounded-full transition-colors bg-slate-600" />
                                                <div>
                                                    <p className="text-sm font-bold">{shipment.main_vessel_name} - {shipment.current_status_step || 'Pending'}</p>
                                                    <p className="text-xs text-slate-500">
                                                        {shipment.eta_at_pod
                                                            ? `ETA: ${new Date(shipment.eta_at_pod).toLocaleDateString('en-GB')}`
                                                            : 'ETA: TBD'}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold inline-block ${hasLog ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'
                                                            }`}>
                                                            {hasLog ? 'Live' : 'Estimated'}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400">
                                                            BK: {shipment.booking_no}
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        <div className="glass-card p-6 rounded-2xl bg-gradient-to-br from-accent-blue/10 to-transparent border-accent-blue/20 h-fit">
                            <h3 className="font-bold mb-2 text-accent-blue">Premium Support</h3>
                            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                                Need help with your shipment or have a special request? Our support team is available 24/7.
                            </p>
                            <button className="w-full py-2 bg-accent-blue text-navy-dark font-bold text-xs rounded-lg transition-transform hover:scale-[1.02] active:scale-95">
                                Contact Agent
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
