'use client'

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import StatsCards from '@/components/StatsCards';
import ShipmentTable from '@/components/ShipmentTable';
import { Bell, Search, User } from 'lucide-react';
import type { Shipment, TrackingLog, DashboardStats, SelectedVessel } from '@/types';

// Dynamically import the map to avoid SSR issues with Leaflet
const VesselMap = dynamic(() => import('@/components/VesselMap'), {
    ssr: false,
    loading: () => <div className="glass-card rounded-2xl h-[500px] mb-8 animate-pulse bg-white/5" />
});

interface DashboardClientProps {
    shipments: Shipment[];
    logs: TrackingLog[];
    stats: DashboardStats;
}

export default function DashboardClient({ shipments, logs, stats }: DashboardClientProps) {
    const [selectedVessel, setSelectedVessel] = useState<SelectedVessel | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [trackingLogs, setTrackingLogs] = useState<TrackingLog[]>(logs);

    // Filter shipments based on search term and attach last_sync from logs
    const filteredShipments = shipments
        .filter(ship => {
            const term = searchTerm.toLowerCase();
            return (
                ship.booking_no.toLowerCase().includes(term) ||
                ship.main_vessel_name.toLowerCase().includes(term) ||
                ship.shipper_name?.toLowerCase().includes(term) ||
                ship.consignee_name?.toLowerCase().includes(term)
            );
        })
        .map(ship => {
            // Find the latest log for this shipment to get the last_sync time
            const shipLog = trackingLogs.find(log =>
                log.shipment_id === ship.id ||
                (log.shipments?.booking_no === ship.booking_no && ship.booking_no) ||
                (log.mmsi === ship.mmsi && ship.mmsi)
            );

            return {
                ...ship,
                last_sync: shipLog?.last_sync
            };
        });



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
        // Find the latest log for this shipment using flexible linkage
        const shipLog = trackingLogs.find(log =>
            log.shipment_id === shipment.id ||
            (log.shipments?.booking_no === shipment.booking_no && shipment.booking_no) ||
            (log.mmsi === shipment.mmsi && shipment.mmsi)
        );

        let latitude: number;
        let longitude: number;
        let statusTag: string;
        let speed: number | null = null;
        let flag: string | undefined = undefined;

        if (shipLog) {
            // Use tracking log coordinates
            latitude = shipLog.latitude;
            longitude = shipLog.longitude;
            speed = shipLog.speed_knots;
            flag = shipLog.flag;

            // Calculate age to determine if it's "LIVE" or "STALE" (based on 6h rule)
            const lastSyncTime = new Date(shipLog.last_sync).getTime();
            const ageInHours = (Date.now() - lastSyncTime) / (1000 * 60 * 60);
            statusTag = ageInHours < 6 ? 'LIVE' : 'STALE';
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
            flag: flag,
            speed: speed,
        });
    };

    const handleRefreshLocation = async (shipmentToRefresh?: any) => {
        const ship = shipmentToRefresh || selectedVessel;
        if (!ship || !ship.mmsi) {
            console.warn('Cannot refresh: No vessel selected or MMSI missing');
            return;
        }

        setIsRefreshing(true);
        try {
            const response = await fetch(
                `/api/vessel-location?mmsi=${ship.mmsi}&shipmentId=${ship.id}&forceRefresh=true`
            );
            const data = await response.json();

            if (response.ok && data.latitude && data.longitude) {
                // Update the local tracking logs state immediately
                setTrackingLogs(prevLogs => {
                    const existingLogIndex = prevLogs.findIndex(l => l.mmsi === ship.mmsi || l.shipment_id === ship.id);
                    const newLog: TrackingLog = {
                        id: existingLogIndex >= 0 ? prevLogs[existingLogIndex].id : `temp-${Date.now()}`,
                        shipment_id: ship.id,
                        latitude: data.latitude,
                        longitude: data.longitude,
                        speed_knots: data.speed || 0,
                        course: data.course || 0,
                        status: data.status || 'Active', // Use new status or default
                        vessel_name: data.name || ship.main_vessel_name,
                        mmsi: ship.mmsi,
                        flag: data.flag || 'Unknown',
                        last_sync: new Date().toISOString(),
                        shipments: existingLogIndex >= 0 ? prevLogs[existingLogIndex].shipments : {
                            booking_no: ship.booking_no,
                            main_vessel_name: ship.main_vessel_name
                        }
                    };

                    if (existingLogIndex >= 0) {
                        const newLogs = [...prevLogs];
                        newLogs[existingLogIndex] = { ...newLogs[existingLogIndex], ...newLog };
                        return newLogs;
                    } else {
                        return [newLog, ...prevLogs];
                    }
                });

                // If the refreshed shipment is currently selected, update its state
                if (selectedVessel && selectedVessel.id === ship.id) {
                    setSelectedVessel(prev => prev ? {
                        ...prev,
                        latitude: data.latitude,
                        longitude: data.longitude,
                        status: data.status || prev.status,
                        flag: data.flag || prev.flag,
                        speed: data.speed || prev.speed,
                        statusTag: 'LIVE',
                        // Force refresh timestamp display
                        scheduledDate: `ETA: ${ship.eta_at_pod ? new Date(ship.eta_at_pod).toLocaleDateString('en-GB') : 'TBD'}`
                    } : null);
                }
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
        <div className="flex h-screen overflow-hidden bg-[#0A1628]">
            <Sidebar />

            <main className="flex-1 lg:ml-64 flex flex-col h-full bg-[#0A1628]/50 overflow-hidden">
                {/* Fixed Top Section: Header + Stats + Map */}
                <div className="p-8 pb-0 flex-none space-y-6">
                    {/* Top Header */}
                    <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="flex items-center gap-8">
                            <div>
                                <h1 className="text-3xl font-bold text-white mb-2">Fleet Dashboard</h1>
                                <p className="text-slate-400 text-xs">Welcome back, here's what's happening with your shipments.</p>
                            </div>
                            <div className="hidden xl:block">
                                <StatsCards stats={stats} variant="compact" />
                            </div>
                        </div>

                        <div className="flex items-center space-x-4 self-end lg:self-center">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-accent-blue transition-colors" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search Booking, Vessel, Shipper..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-accent-blue/50 focus:bg-white/10 transition-all w-72"
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

                    <div className="xl:hidden mb-0">
                        <StatsCards stats={stats} />
                    </div>

                    <VesselMap logs={trackingLogs} selectedVessel={selectedVessel} />
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto p-8 pt-0 scrollbar-hide">
                    <div className="space-y-8">
                        {/* Shipment Table */}
                        <div className="w-full">
                            <ShipmentTable
                                shipments={filteredShipments}
                                onShipmentSelect={handleShipmentSelect}
                                onRefreshLocation={handleRefreshLocation}
                                selectedId={selectedVessel?.id}
                                isRefreshing={isRefreshing}
                            />
                        </div>

                        {/* Bottom Section: Route Schedule & Support - 2 Columns */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-8">
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
                                                        <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold inline-block ${selectedVessel.statusTag === 'LIVE' ? 'bg-green-500/20 text-green-400' :
                                                            selectedVessel.statusTag === 'STALE' ? 'bg-orange-500/20 text-orange-400' :
                                                                'bg-slate-500/20 text-slate-400'
                                                            }`}>
                                                            {selectedVessel.statusTag}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400">
                                                            BK: {selectedVessel.bookingNo}
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>
                                        </>
                                    ) : (
                                        // Show list of top 5 shipments when nothing selected
                                        shipments.slice(0, 5).map((shipment) => {
                                            const hasLog = trackingLogs.some(l => l.shipment_id === shipment.id);
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
                </div>
            </main>
        </div>
    );
}
