'use client'

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import StatsCards from '@/components/StatsCards';
import ShipmentTable from '@/components/ShipmentTable';
import { Bell, Search, User } from 'lucide-react';

// Dynamically import the map to avoid SSR issues with Leaflet
const VesselMap = dynamic(() => import('@/components/VesselMap'), {
    ssr: false,
    loading: () => <div className="glass-card rounded-2xl h-[500px] mb-8 animate-pulse bg-white/5" />
});

// Sample vessel data for Route Schedule
const routeScheduleData = [
    {
        id: 'hmm-hope-1',
        name: 'HMM HOPE',
        status: 'DEPARTURE',
        scheduledDate: 'Jan 25, 2026',
        statusTag: 'On Time',
        latitude: 13.048,
        longitude: 100.897,
        bookingNo: 'BK-2026-001'
    },
    {
        id: 'hmm-hope-2',
        name: 'HMM HOPE',
        status: 'DEPARTURE',
        scheduledDate: 'Jan 28, 2026',
        statusTag: 'On Time',
        latitude: 1.264,
        longitude: 103.822,
        bookingNo: 'BK-2026-002'
    }
];

interface DashboardClientProps {
    shipments: any[];
    logs: any[];
    stats: any;
}

export default function DashboardClient({ shipments, logs, stats }: DashboardClientProps) {
    const [selectedVessel, setSelectedVessel] = useState<typeof routeScheduleData[0] | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Filter shipments based on search term
    const filteredShipments = shipments.filter(ship =>
        ship.booking_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ship.main_vessel_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleVesselClick = (vessel: typeof routeScheduleData[0]) => {
        setSelectedVessel(vessel);
    };

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
            status: shipment.current_status_step || 'Unknown',
            scheduledDate: shipment.eta_at_pod ? `ETA: ${new Date(shipment.eta_at_pod).toLocaleDateString('en-GB')}` : 'ETA: TBD',
            statusTag,
            latitude,
            longitude,
            bookingNo: shipment.booking_no
        });
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

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div className="xl:col-span-2">
                        <VesselMap logs={logs} selectedVessel={selectedVessel} />
                        <ShipmentTable
                            shipments={filteredShipments}
                            onShipmentSelect={handleShipmentSelect}
                        />
                    </div>

                    <div className="space-y-8">
                        <div className="glass-card p-6 rounded-2xl">
                            <h3 className="font-bold mb-4">Route Schedule</h3>
                            <div className="space-y-3">
                                {routeScheduleData.map((vessel) => (
                                    <button
                                        key={vessel.id}
                                        onClick={() => handleVesselClick(vessel)}
                                        className={`w-full flex space-x-3 items-start text-left p-3 rounded-xl transition-all duration-200 ${selectedVessel?.id === vessel.id
                                            ? 'bg-accent-blue/20 border border-accent-blue/50'
                                            : 'hover:bg-white/5 border border-transparent'
                                            }`}
                                    >
                                        <div className={`w-1 h-12 rounded-full transition-colors ${selectedVessel?.id === vessel.id ? 'bg-accent-blue' : 'bg-slate-600'
                                            }`} />
                                        <div>
                                            <p className="text-sm font-bold">{vessel.name} - {vessel.status}</p>
                                            <p className="text-xs text-slate-500">Scheduled: {vessel.scheduledDate}</p>
                                            <span className="text-[10px] px-2 py-0.5 bg-green-500/20 text-green-400 rounded uppercase font-bold mt-1 inline-block">
                                                {vessel.statusTag}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="glass-card p-6 rounded-2xl bg-gradient-to-br from-accent-blue/10 to-transparent border-accent-blue/20">
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
