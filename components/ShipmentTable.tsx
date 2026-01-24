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
}

export default function ShipmentTable({ shipments, onShipmentSelect }: ShipmentTableProps) {
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
                <table className="w-full text-left min-w-[1200px]">
                    <thead>
                        <tr className="bg-white/5 text-slate-400 text-sm uppercase tracking-wider">
                            <th className="px-6 py-4 font-semibold">Shipment / Vessel</th>
                            <th className="px-6 py-4 font-semibold">Shipper / Consignee</th>
                            <th className="px-6 py-4 font-semibold">Route (POL → Final)</th>
                            <th className="px-6 py-4 font-semibold">Agent</th>
                            <th className="px-6 py-4 font-semibold">Status</th>
                            <th className="px-6 py-4 font-semibold">Schedule (ETD/ETA)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {shipments.map((ship) => (
                            <tr
                                key={ship.id}
                                onClick={() => onShipmentSelect && onShipmentSelect(ship)}
                                className="hover:bg-white/5 transition-colors group cursor-pointer"
                            >
                                {/* 1. Shipment / Vessel */}
                                <td className="px-6 py-5">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                                            <Ship size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-white tracking-wide">{ship.booking_no}</p>
                                            <div className="flex items-center text-xs text-slate-400 mt-1 space-x-2">
                                                <span className="font-medium text-slate-300">{ship.main_vessel_name}</span>
                                                <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                                <span className="bg-slate-700/50 px-1.5 py-0.5 rounded text-[10px]">
                                                    {ship.voyage_no}
                                                </span>
                                            </div>
                                            {ship.carrier_name && (
                                                <p className="text-[10px] text-accent-blue mt-1 uppercase font-bold tracking-wider opacity-80">
                                                    {ship.carrier_name}
                                                </p>
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
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
