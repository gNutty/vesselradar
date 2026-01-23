'use client'

import { LayoutDashboard, Ship, Settings, LogOut } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function Sidebar() {
    const pathname = usePathname();

    const menuItems = [
        { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
        { name: 'Shipments', icon: Ship, href: '/shipments' },
        { name: 'Analytics', icon: Settings, href: '/analytics' },
    ];

    const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 glass-sidebar hidden lg:flex flex-col p-6 z-50">
            <Link href="/dashboard" className="flex items-center space-x-3 mb-12 px-2">
                <div className="bg-accent-blue p-2 rounded-xl">
                    <Ship size={24} className="text-navy-dark" />
                </div>
                <h1 className="text-xl font-black bg-gradient-to-r from-white to-white/50 bg-clip-text text-transparent">
                    VESSELRADAR
                </h1>
            </Link>

            <nav className="flex-1 space-y-2">
                {menuItems.map((item) => (
                    <Link
                        key={item.name}
                        href={item.href}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${isActive(item.href)
                            ? 'bg-accent-blue text-navy-dark font-bold shadow-lg shadow-accent-blue/20'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <item.icon size={20} />
                        <span>{item.name}</span>
                    </Link>
                ))}
            </nav>

            <div className="pt-6 border-t border-white/10">
                <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <LogOut size={20} />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
}
