import { Ship, Anchor, CheckCircle } from 'lucide-react';

interface StatsProps {
    stats: {
        total: number;
        inTransit: number;
        arrived: number;
    };
    variant?: 'default' | 'compact';
}

export default function StatsCards({ stats, variant = 'default' }: StatsProps) {
    const cards = [
        { label: 'Total Shipments', value: stats.total, icon: Ship, color: 'text-blue-400' },
        { label: 'In Transit', value: stats.inTransit, icon: Anchor, color: 'text-accent-blue' },
        { label: 'Arrived', value: stats.arrived, icon: CheckCircle, color: 'text-green-400' },
    ];

    if (variant === 'compact') {
        return (
            <div className="flex items-center space-x-3">
                {cards.map((card, i) => (
                    <div key={i} className="glass-card py-2 px-4 rounded-xl flex items-center space-x-3 bg-white/5 border border-white/10">
                        <div className={`p-1.5 rounded-lg bg-white/5 ${card.color}`}>
                            <card.icon size={16} />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-medium leading-none mb-1">{card.label}</p>
                            <p className="text-lg font-bold leading-none">{card.value}</p>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {cards.map((card, i) => (
                <div key={i} className="glass-card p-6 rounded-2xl flex items-center space-x-4">
                    <div className={`p-4 rounded-xl bg-white/5 ${card.color}`}>
                        <card.icon size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-400 font-medium">{card.label}</p>
                        <p className="text-2xl font-bold">{card.value}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
