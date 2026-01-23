import { getShipments } from '@/lib/actions/shipmentActions';
import ShipmentTable from '@/components/ShipmentTable';
import Sidebar from '@/components/Sidebar';
import { Ship, Package, MapPin, Clock } from 'lucide-react';

export default async function ShipmentsPage() {
    const shipments = await getShipments();

    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 lg:ml-64 p-8">
                <div className="p-8">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-black bg-gradient-to-r from-accent-blue to-blue-400 bg-clip-text text-transparent mb-2">
                            Shipments
                        </h1>
                        <p className="text-slate-400">Manage and track all your shipments in one place.</p>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="glass-card rounded-2xl p-6">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-accent-blue/10 rounded-xl">
                                    <Package size={24} className="text-accent-blue" />
                                </div>
                                <div>
                                    <p className="text-slate-400 text-sm">Total Shipments</p>
                                    <p className="text-2xl font-bold text-white">{shipments.length}</p>
                                </div>
                            </div>
                        </div>
                        <div className="glass-card rounded-2xl p-6">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-green-500/10 rounded-xl">
                                    <Ship size={24} className="text-green-400" />
                                </div>
                                <div>
                                    <p className="text-slate-400 text-sm">On Vessel</p>
                                    <p className="text-2xl font-bold text-white">
                                        {shipments.filter((s: any) => s.current_status_step === 'On Vessel').length}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="glass-card rounded-2xl p-6">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-yellow-500/10 rounded-xl">
                                    <Clock size={24} className="text-yellow-400" />
                                </div>
                                <div>
                                    <p className="text-slate-400 text-sm">Pending</p>
                                    <p className="text-2xl font-bold text-white">
                                        {shipments.filter((s: any) => s.current_status_step === 'Booking').length}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="glass-card rounded-2xl p-6">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-purple-500/10 rounded-xl">
                                    <MapPin size={24} className="text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-slate-400 text-sm">Arrived</p>
                                    <p className="text-2xl font-bold text-white">
                                        {shipments.filter((s: any) => s.current_status_step === 'Arrived').length}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Shipment Table */}
                    <ShipmentTable shipments={shipments} />
                </div>
            </main>
        </div>
    );
}
