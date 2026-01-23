import { Settings, BarChart3, TrendingUp, Activity } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

export default function AnalyticsPage() {
    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 lg:ml-64 p-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-black bg-gradient-to-r from-accent-blue to-blue-400 bg-clip-text text-transparent mb-2">
                        Analytics
                    </h1>
                    <p className="text-slate-400">View insights and performance metrics for your shipments.</p>
                </div>

                {/* Coming Soon */}
                <div className="glass-card rounded-2xl p-12 text-center">
                    <div className="flex justify-center mb-6">
                        <div className="p-6 bg-accent-blue/10 rounded-2xl">
                            <BarChart3 size={48} className="text-accent-blue" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">Coming Soon</h2>
                    <p className="text-slate-400 max-w-md mx-auto">
                        We're working on powerful analytics features to help you track shipment performance,
                        delivery times, and carrier efficiency.
                    </p>

                    {/* Preview Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                        <div className="glass-card rounded-xl p-6 opacity-50">
                            <TrendingUp size={32} className="text-green-400 mx-auto mb-3" />
                            <p className="text-white font-medium">Delivery Performance</p>
                        </div>
                        <div className="glass-card rounded-xl p-6 opacity-50">
                            <Activity size={32} className="text-purple-400 mx-auto mb-3" />
                            <p className="text-white font-medium">Transit Time Analysis</p>
                        </div>
                        <div className="glass-card rounded-xl p-6 opacity-50">
                            <Settings size={32} className="text-yellow-400 mx-auto mb-3" />
                            <p className="text-white font-medium">Carrier Comparison</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
