import { Ship, Clock } from 'lucide-react';

interface Shipment {
    id: string;
    booking_no: string;
    main_vessel_name: string;
    voyage_no: string;
    current_status_step: string;
    pod_name: string;
    eta_at_pod: string;
}

const statusProgress: Record<string, number> = {
    'Booking': 25,
    'Loading': 50,
    'On Vessel': 75,
    'Arrived': 100,
};

export default function ShipmentTable({ shipments }: { shipments: Shipment[] }) {
    return (
        <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <h2 className="text-xl font-bold">Active Shipments</h2>
                <span className="px-3 py-1 bg-accent-blue/20 text-accent-blue text-xs font-bold rounded-full uppercase tracking-wider">
                    Live Tracking
                </span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-white/5 text-slate-400 text-sm uppercase tracking-wider">
                            <th className="px-6 py-4 font-semibold">Shipment / Vessel</th>
                            <th className="px-6 py-4 font-semibold">Destination</th>
                            <th className="px-6 py-4 font-semibold">Status</th>
                            <th className="px-6 py-4 font-semibold">ETA</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {shipments.map((ship) => (
                            <tr key={ship.id} className="hover:bg-white/5 transition-colors group">
                                <td className="px-6 py-5">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                                            <Ship size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-white">{ship.booking_no}</p>
                                            <p className="text-sm text-slate-400">{ship.main_vessel_name} ({ship.voyage_no})</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-5 underline-offset-4 decoration-accent-blue/30">
                                    <p className="font-medium">{ship.pod_name}</p>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="w-full max-w-[140px]">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-accent-blue font-bold">{ship.current_status_step}</span>
                                            <span className="text-slate-500">{statusProgress[ship.current_status_step] || 0}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-accent-blue transition-all duration-500"
                                                style={{ width: `${statusProgress[ship.current_status_step] || 0}%` }}
                                            />
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center text-slate-300">
                                        <Clock size={16} className="mr-2 text-slate-500" />
                                        <span className="text-sm">{new Date(ship.eta_at_pod).toLocaleDateString()}</span>
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
