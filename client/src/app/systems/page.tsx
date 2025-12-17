'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function SystemsPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('overview');

    // Mock Data for a Specific System
    const system = {
        name: "VertiGrow Tower V2",
        status: "Healthy",
        image: "/assets/images/systems/tower.jpg",
        lastMaintainence: "Oct 20, 2024",
        nextMaintainence: "Nov 03, 2024",
        stats: {
            waterUsage: "12L / week",
            plants: 32,
            lightHours: "14h / day",
            nutrientLevel: "Good (1.8 EC)",
            phLevel: "6.2"
        },
        gallery: [
            "/assets/images/systems/gallery_seedlings.png",
            "/assets/images/systems/gallery_growth.png",
            "/assets/images/systems/gallery_blooming.png",
            "/assets/images/systems/gallery_harvest.png"
        ],
        team: [
            { role: "Maintenance", name: "Budi Santoso", contact: "+62 812..." },
            { role: "Artisan Creator", name: "Wayan Sudra", contact: "View Profile" }
        ],
        notes: [
            { date: "Oct 20", text: "Refilled nutrient tank A." },
            { date: "Oct 12", text: "Harvested 2kg of Bok Choy." }
        ]
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <button
                        onClick={() => router.back()}
                        className="flex items-center text-gray-500 hover:text-green-600 mb-2 transition-colors"
                    >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900">{system.name}</h1>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="w-3 h-3 rounded-full bg-green-500"></span>
                        <span className="text-sm font-medium text-green-700">{system.status}</span>
                        <span className="text-gray-400 mx-2">•</span>
                        <span className="text-sm text-gray-500">Next Service: {system.nextMaintainence}</span>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm">
                        Request Service
                    </button>
                    <button className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 shadow-sm">
                        Add Note
                    </button>
                </div>
            </div>

            {/* Main Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column (Image & Quick Stats) */}
                <div className="space-y-6">
                    {/* System Image Card */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                        <div className="aspect-[4/5] bg-gray-100 rounded-xl flex items-center justify-center relative overflow-hidden">
                            <Image
                                src={system.image}
                                alt={system.name}
                                fill
                                className="object-cover"
                            />
                        </div>
                    </div>

                    {/* Key Measurables */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-4">Vital Statistics</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                                <span className="text-sm text-gray-500">Plants Growing</span>
                                <span className="font-bold text-gray-900">{system.stats.plants}</span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                                <span className="text-sm text-gray-500">Water Usage</span>
                                <span className="font-bold text-blue-600">{system.stats.waterUsage}</span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                                <span className="text-sm text-gray-500">Lights</span>
                                <span className="font-bold text-yellow-600">{system.stats.lightHours}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500">pH Level</span>
                                <span className="font-bold text-green-600">{system.stats.phLevel}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column (Tabs & Detailed Content) */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Gallery Section */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-4">Growth Gallery</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {system.gallery.map((img, i) => (
                                <div key={i} className="aspect-square bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer flex items-center justify-center relative overflow-hidden">
                                    <Image
                                        src={img}
                                        alt={`Growth stage ${i + 1}`}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            ))}
                            <div className="aspect-square border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-green-400 hover:text-green-500 transition cursor-pointer">
                                <span className="text-2xl">+</span>
                                <span className="text-xs">Upload</span>
                            </div>
                        </div>
                    </div>

                    {/* Team Section */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-4">Support Team</h3>
                        <div className="flex flex-col md:flex-row gap-4">
                            {system.team.map((member, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 flex-1">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                        {member.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{member.name}</p>
                                        <p className="text-xs text-gray-500">{member.role}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Notes Section */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-4">System Notes</h3>
                        <div className="space-y-4">
                            {system.notes.map((note, idx) => (
                                <div key={idx} className="flex gap-4">
                                    <span className="text-xs font-bold text-gray-400 w-12 pt-1">{note.date}</span>
                                    <p className="text-sm text-gray-700 bg-yellow-50 p-3 rounded-lg flex-1 border border-yellow-100">
                                        {note.text}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
