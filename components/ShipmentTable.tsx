'use client';

import { Ship, Clock, Anchor } from 'lucide-react';

interface Shipment {
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
    last_sync?: string;
}

const statusProgress: Record<string, number> = {
    'Booking': 25,
    'Loading': 50,
    'On Vessel': 75,
    'Arrived': 100,
};

interface ShipmentTableProps {
    shipments: Shipment[];
    onShipmentSelect?: (shipment: Shipment) => void;
    onRefreshLocation?: (shipment: Shipment) => void;
    selectedId?: string;
    isRefreshing?: boolean;
}

export default function ShipmentTable({
    shipments,
    onShipmentSelect,
    onRefreshLocation,
    selectedId,
    isRefreshing
}: ShipmentTableProps) {
    return (
        <div className="glass-card rounded-2xl overflow-hidden mt-8">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                    <h2 className="text-xl font-bold">Active Shipments</h2>
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded border border-blue-500/20">
                        v1.3 LIVE
                    </span>
                </div>
                <span className="px-3 py-1 bg-accent-blue/20 text-accent-blue text-xs font-bold rounded-full uppercase tracking-wider">
                    {shipments.length} Active
                </span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[1200px] border-separate border-spacing-0">
                    <thead>
                        <tr className="bg-white/5 text-slate-400 text-sm uppercase tracking-wider">
                            <th className="px-6 py-4 font-semibold sticky left-0 z-20 bg-[#1e293b] shadow-[2px_0_5px_rgba(0,0,0,0.3)]">Shipment / Vessel</th>
                            <th className="px-6 py-4 font-semibold">Shipper / Consignee</th>
                            <th className="px-6 py-4 font-semibold">Route (POL → Final)</th>
                            <th className="px-6 py-4 font-semibold">Agent</th>
                            <th className="px-6 py-4 font-semibold">Status</th>
                            <th className="px-6 py-4 font-semibold">Schedule (ETD/ETA)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {shipments.map((ship) => {
                            const isSelected = ship.id === selectedId;
                            return (
                                <tr
                                    key={ship.id}
                                    onClick={() => onShipmentSelect && onShipmentSelect(ship)}
                                    className={`transition-colors group cursor-pointer ${isSelected ? 'bg-accent-blue/10' : 'hover:bg-white/5'}`}
                                >
                                    {/* 1. Shipment / Vessel */}
                                    <td className={`px-6 py-5 sticky left-0 z-10 transition-colors ${isSelected ? 'bg-[#24344d]' : 'bg-[#0f172a] group-hover:bg-[#1e293b]'} shadow-[2px_0_5px_rgba(0,0,0,0.3)]`}>
                                        <div className="flex items-center space-x-3">
                                            <div className={`p-2 rounded-lg transition-colors ${isSelected ? 'bg-accent-blue text-navy-dark' : 'bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20'}`}>
                                                {isSelected ? <Clock size={20} className="animate-pulse" /> : <Ship size={20} />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-white tracking-wide">{ship.booking_no}</p>
                                                    {isSelected && (
                                                        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-accent-blue text-navy-dark">
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
                                                                <polyline points="20 6 9 17 4 12"></polyline>
                                                            </svg>
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center text-xs text-slate-400 mt-1 space-x-2">
                                                    <span className="font-medium text-slate-300">{ship.main_vessel_name}</span>
                                                    <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                                    <span className="bg-slate-700/50 px-1.5 py-0.5 rounded text-[10px]">
                                                        {ship.voyage_no}
                                                    </span>
                                                    {ship.mmsi && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onRefreshLocation && onRefreshLocation(ship);
                                                            }}
                                                            disabled={isRefreshing && isSelected}
                                                            className={`ml-1 p-1 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all ${isRefreshing && isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                            title="Refresh Location"
                                                        >
                                                            <svg
                                                                viewBox="0 0 24 24"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth="2.5"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                className={`w-3 h-3 text-accent-blue ${isRefreshing && isSelected ? 'animate-spin' : ''}`}
                                                            >
                                                                <path d="M23 4v6h-6"></path>
                                                                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                                {ship.carrier_name && (
                                                    <p className="text-[10px] text-accent-blue mt-1 uppercase font-bold tracking-wider opacity-80">
                                                        {ship.carrier_name}
                                                    </p>
                                                )}
                                                {ship.last_sync && (
                                                    <div className="flex items-center text-[10px] text-slate-500 mt-1.5 space-x-1.5 bg-white/5 w-fit px-2 py-0.5 rounded-md border border-white/5">
                                                        <Clock size={10} className="text-slate-500" />
                                                        <span>Updated: {new Date(ship.last_sync).toLocaleString('en-GB', { 
                                                            day: '2-digit', 
                                                            month: '2-digit', 
                                                            year: 'numeric',
                                                            hour: '2-digit', 
                                                            minute: '2-digit',
                                                            hour12: false 
                                                        })}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>


                                    {/* 2. Shipper / Consignee */}
                                    <td className="px-6 py-5">
                                        <div className="space-y-3">
                                            <div>
                                                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Shipper</p>
                                                <p className="text-sm font-medium text-slate-200 line-clamp-1" title={ship.shipper_name || '-'}>
                                                    {ship.shipper_name || '-'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Consignee</p>
                                                <p className="text-sm font-medium text-slate-200 line-clamp-1" title={ship.consignee_name || '-'}>
                                                    {ship.consignee_name || '-'}
                                                </p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* 3. Route (POL -> Final) */}
                                    <td className="px-6 py-5">
                                        <div className="relative pl-3 border-l text-sm space-y-2 border-slate-700">
                                            {/* POL */}
                                            <div className="relative">
                                                <span className="absolute -left-[17px] top-1.5 w-2 h-2 rounded-full bg-slate-500"></span>
                                                <p className="text-xs text-slate-400">POL</p>
                                                <p className="font-medium text-slate-200">{ship.port_of_loading || 'Unspecified'}</p>
                                            </div>

                                            {/* POD */}
                                            <div className="relative">
                                                <span className="absolute -left-[17px] top-1.5 w-2 h-2 rounded-full bg-accent-blue shadow-[0_0_8px_rgba(56,189,248,0.5)]"></span>
                                                <p className="text-xs text-slate-400">POD</p>
                                                <p className="font-bold text-accent-blue">{ship.pod_name}</p>
                                            </div>

                                            {/* Final Destination */}
                                            {ship.final_destination && (
                                                <div className="relative">
                                                    <span className="absolute -left-[17px] top-1.5 w-2 h-2 rounded-full bg-emerald-500"></span>
                                                    <p className="text-xs text-slate-400">Final</p>
                                                    <p className="font-medium text-slate-200">{ship.final_destination}</p>
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    {/* 4. Agent */}
                                    <td className="px-6 py-5">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400">
                                                <span className="text-xs font-bold">AG</span>
                                            </div>
                                            <p className="text-sm text-slate-300 font-medium line-clamp-2 max-w-[150px]" title={ship.agent_company || '-'}>
                                                {ship.agent_company || '-'}
                                            </p>
                                        </div>
                                    </td>

                                    {/* 5. Status */}
                                    <td className="px-6 py-5">
                                        <div className="w-full max-w-[120px]">
                                            <div className="flex justify-between text-xs mb-1.5">
                                                <span className="text-accent-blue font-bold tracking-tight">{ship.current_status_step}</span>
                                                <span className="text-slate-500 font-mono">{statusProgress[ship.current_status_step] || 0}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-700/50 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-blue-600 to-accent-blue transition-all duration-500 shadow-[0_0_10px_rgba(56,189,248,0.3)]"
                                                    style={{ width: `${statusProgress[ship.current_status_step] || 0}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>

                                    {/* 6. Schedule (ETD / ETA) */}
                                    <td className="px-6 py-5">
                                        <div className="space-y-3">
                                            {/* ETD */}
                                            <div className="flex items-center justify-between group/date">
                                                <span className="text-[10px] font-bold text-slate-500 bg-slate-800/50 px-1.5 rounded uppercase">ETD</span>
                                                <span className="text-sm text-slate-300 font-mono">
                                                    {ship.etd_at_pol ? new Date(ship.etd_at_pol).toLocaleDateString('en-GB') : '-'}
                                                </span>
                                            </div>

                                            {/* ETA */}
                                            <div className="flex items-center justify-between group/date">
                                                <span className="text-[10px] font-bold text-emerald-500/80 bg-emerald-500/10 px-1.5 rounded uppercase">ETA</span>
                                                <span className="text-sm text-white font-bold font-mono">
                                                    {new Date(ship.eta_at_pod).toLocaleDateString('en-GB')}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
