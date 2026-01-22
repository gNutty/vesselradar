'use client'

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

interface DashboardClientProps {
    shipments: any[];
    logs: any[];
    stats: any;
}

export default function DashboardClient({ shipments, logs, stats }: DashboardClientProps) {
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
                                placeholder="Search Booking ID..."
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
                        <VesselMap logs={logs} />
                        <ShipmentTable shipments={shipments} />
                    </div>

                    <div className="space-y-8">
                        <div className="glass-card p-6 rounded-2xl">
                            <h3 className="font-bold mb-4">Route Schedule</h3>
                            <div className="space-y-4">
                                {[1, 2].map((i) => (
                                    <div key={i} className="flex space-x-3 items-start">
                                        <div className="w-1 h-12 bg-accent-blue rounded-full" />
                                        <div>
                                            <p className="text-sm font-bold">HMM HOPE - DEPARTURE</p>
                                            <p className="text-xs text-slate-500">Scheduled: Jan 25, 2026</p>
                                            <span className="text-[10px] px-2 py-0.5 bg-green-500/20 text-green-400 rounded uppercase font-bold mt-1 inline-block">
                                                On Time
                                            </span>
                                        </div>
                                    </div>
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
