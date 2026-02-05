import DashboardClient from '@/components/DashboardClient';
import { getShipments, getLatestTrackingLogs, getDashboardStats } from '@/lib/actions/shipmentActions';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    try {
        // Parallel data fetching using Promise.all (async-parallel rule)
        const [shipments, logs, stats] = await Promise.all([
            getShipments(),
            getLatestTrackingLogs(),
            getDashboardStats(),
        ]);

        return (
            <DashboardClient
                shipments={shipments}
                logs={logs}
                stats={stats}
            />
        );
    } catch (error) {
        return (
            <DashboardClient
                shipments={[]}
                logs={[]}
                stats={{ total: 0, inTransit: 0, arrived: 0 }}
            />
        );
    }
}
