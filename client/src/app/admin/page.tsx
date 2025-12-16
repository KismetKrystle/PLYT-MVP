'use client';

import { useState } from 'react';

export default function AdminPage() {
    const [activeRole, setActiveRole] = useState<'admin' | 'grower' | 'consumer'>('admin');

    const handleRoleSwitch = (role: 'admin' | 'grower' | 'consumer') => {
        setActiveRole(role);
        // In a real app, this would update the global User Context
        // For now, it's a visual demo of what the dashboard WOULD look like
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header with Role Switcher */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Platform Admin</h1>
                    <p className="text-gray-500 mt-1">Manage users, systems, and platform health.</p>
                </div>

                {/* Role Toggle Demo Widget */}
                <div className="bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-1">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 mr-1">View As:</span>
                    {(['consumer', 'grower', 'admin'] as const).map((role) => (
                        <button
                            key={role}
                            onClick={() => handleRoleSwitch(role)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${activeRole === role
                                    ? 'bg-green-100 text-green-800 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <MetricCard title="Total Users" value="1,248" change="+12% this month" icon="users" />
                <MetricCard title="Active Systems" value="85" change="+5 new today" icon="server" color="blue" />
                <MetricCard title="Marketplace Sales" value="$12,450" change="+8% vs last week" icon="chart" color="green" />
                <MetricCard title="Carbon Offset" value="3.2 Tons" change="On track" icon="leaf" color="emerald" />
            </div>

            {/* Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Recent Activity (Calls to Action) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Activity Feed */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-semibold text-gray-900">Live Activity Feed</h3>
                            <button className="text-sm text-green-600 font-medium hover:underline">View All</button>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs">
                                        {'U' + i}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900">User #{4000 + i} placed an order</p>
                                        <p className="text-xs text-gray-500">2 minutes ago • ID: #{90210 + i}</p>
                                    </div>
                                    <span className="px-2 py-1 rounded bg-green-50 text-green-700 text-xs font-medium">Completed</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: System Health & Alerts */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            System Alerts (3)
                        </h3>
                        <div className="space-y-3">
                            <AlertItem title="PH Sensor Offline" subtitle="Tower #402 - Ubud Farm" severity="high" />
                            <AlertItem title="Low Water Level" subtitle="Home Unit - User #882" severity="medium" />
                            <AlertItem title="Connection Unstable" subtitle="Gateway #12" severity="low" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl text-white p-6 shadow-lg">
                        <h3 className="font-semibold mb-2">Dev Tools</h3>
                        <p className="text-sm text-gray-300 mb-4">Quick actions for development and testing.</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition text-left">Reset Cache</button>
                            <button className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition text-left">Seed DB</button>
                            <button className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition text-left">Test Notification</button>
                            <button className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition text-left">View Logs</button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

function MetricCard({ title, value, change, icon, color = 'indigo' }: any) {
    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition card-shine">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-gray-500 text-sm font-medium">{title}</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
                </div>
                <div className={`p-2 rounded-lg bg-${color}-50 text-${color}-600`}>
                    {/* Icon handling based on string would go here, simplified for MVP */}
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                </div>
            </div>
            <p className="text-xs font-medium text-green-600 flex items-center">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                {change}
            </p>
        </div>
    )
}

function AlertItem({ title, subtitle, severity }: any) {
    const color = severity === 'high' ? 'red' : severity === 'medium' ? 'yellow' : 'blue';
    return (
        <div className={`p-3 rounded-lg bg-${color}-50 border border-${color}-100 flex items-start gap-3`}>
            <div className={`w-2 h-2 rounded-full bg-${color}-500 mt-1.5 shrink-0`} />
            <div>
                <p className={`text-sm font-semibold text-${color}-800`}>{title}</p>
                <p className={`text-xs text-${color}-600`}>{subtitle}</p>
            </div>
        </div>
    )
}
