import DashboardClient from '@/components/DashboardClient';
import { getShipments, getLatestTrackingLogs, getDashboardStats } from '@/lib/actions/shipmentActions';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    try {
        const shipments = await getShipments();
        const logs = await getLatestTrackingLogs();
        const stats = await getDashboardStats();

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
