'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface ProfileProps {
    user: any;
}

// -- Mock Data --

const FOOD_GALLERY = [
    { id: 1, title: 'Cherry Tomatoes', image: '/assets/images/gallery/cherry_tomatoes.png', status: 'Harvested' },
    { id: 2, title: 'Organic Kale', image: '/assets/images/gallery/organic_kale.png', status: 'Growing' },
    { id: 3, title: 'Basil', image: '/assets/images/gallery/fresh_herbs.png', status: 'Harvested' },
    { id: 4, title: 'Spinach', image: '/assets/images/gallery/spinach.png', status: 'Planted' },
];

const GROW_GALLERY = [
    { id: 1, title: 'Vertical Hydro 2.0', image: '/assets/images/gallery/hydro_system.png', type: 'Hydroponic' },
    { id: 2, title: 'Patio Planter', image: '/assets/images/gallery/soil_garden.png', type: 'Soil' },
    { id: 3, title: 'Kitchen Herbs', image: '/assets/images/gallery/indoor_garden.png', type: 'Indoor' },
];

const LEARN_GALLERY = [
    { id: 1, title: 'Hydroponics 101', image: '/assets/images/gallery/teaching_garden.png', progress: 'Completed' },
    { id: 2, title: 'Pest Management', image: '/assets/images/gallery/community_garden.png', progress: 'In Progress' },
    { id: 3, title: 'Nutrient Mixing', image: '/assets/images/gallery/nutrient_mix.png', progress: 'Saved' },
];

const RECIPES = [
    { id: 1, title: 'Fresh Kale Salad', image: '/assets/images/gallery/organic_kale.png', likes: 124 },
    { id: 2, title: 'Tomato Basil Pasta', image: '/assets/images/gallery/cherry_tomatoes.png', likes: 85 },
];

const DIET_JOURNEYS = [
    { id: 1, title: 'My 30 Day Plant-Based Challenge', date: 'Oct 2024', preview: 'Switching to a fully plant-based diet was easier than I thought...' },
    { id: 2, title: 'Reducing Sugar with Homegrown Stevia', date: 'Sep 2024', preview: 'I started growing Stevia to replace processed sugar in my tea...' },
];

const RESOURCES = [
    { id: 1, title: 'Best Local Seed Banks', link: '#', type: 'Link' },
    { id: 2, title: 'Composting Guide PDF', link: '#', type: 'Document' },
];

export default function PublicProfile({ user }: ProfileProps) {
    return (
        <div className="w-full h-full overflow-y-auto bg-gray-50 pb-20 no-scrollbar">

            {/* -- Hero Section -- */}
            <div className="relative w-full h-64 md:h-80 bg-gray-200">
                <Image
                    src="/assets/images/gallery/community_garden.png"
                    alt="Cover Banner"
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                <Link href="/?tab=home_v2" className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full text-xs font-bold backdrop-blur-sm transition border border-white/30 z-20">
                    ✨ Try New Layout
                </Link>

                {/* Profile Info Overlay */}
                <div className="absolute bottom-0 left-0 w-full p-6 md:p-8 flex items-end gap-6">
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white shrink-0 relative">
                        <Image
                            src="/assets/images/gallery/user_avatar.png"
                            alt="Profile Avatar"
                            fill
                            className="object-cover"
                        />
                    </div>
                    <div className="mb-2 text-white">
                        <h1 className="text-3xl md:text-4xl font-bold">{user?.email?.split('@')[0] || 'Urban Gardener'}</h1>
                        <p className="text-white/90 text-sm md:text-base max-w-xl line-clamp-2">
                            Passionate about sustainable living and growing my own food. Join me on my journey to self-sufficiency! 🌱
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">

                {/* -- Section 1: Food You Eat -- */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <span className="w-2 h-8 bg-green-500 rounded-full inline-block" />
                            Food You Eat
                        </h2>
                        <button className="text-sm text-green-600 hover:text-green-700 font-medium">View All</button>
                    </div>
                    <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar snap-x">
                        {FOOD_GALLERY.map(item => (
                            <div key={item.id} className="min-w-[200px] md:min-w-[250px] snap-start bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group cursor-pointer hover:shadow-md transition">
                                <div className="h-32 relative bg-gray-100">
                                    {/* Ideally use Next Image, simpler for mock now */}
                                    <div className="absolute inset-0 bg-gray-200 animate-pulse group-hover:animate-none" />
                                    <Image src={item.image} alt={item.title} fill className="object-cover" />
                                    <div className="absolute top-2 right-2 bg-white/90 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide text-green-800 backdrop-blur-sm">
                                        {item.status}
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="font-semibold text-gray-900 truncate">{item.title}</h3>
                                    <p className="text-xs text-gray-500">Harvested 2 days ago</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* -- Section 2: How You Grow -- */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <span className="w-2 h-8 bg-blue-500 rounded-full inline-block" />
                            How You Grow
                        </h2>
                    </div>
                    <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar snap-x">
                        {GROW_GALLERY.map(item => (
                            <div key={item.id} className="min-w-[280px] snap-start bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition">
                                <div className="h-40 relative">
                                    <Image src={item.image} alt={item.title} fill className="object-cover" />
                                    <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/60 to-transparent p-4">
                                        <p className="text-white font-bold">{item.title}</p>
                                        <p className="text-white/80 text-xs">{item.type}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* -- Section 3: What You Learn -- */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <span className="w-2 h-8 bg-amber-500 rounded-full inline-block" />
                            What You Learn
                        </h2>
                    </div>
                    <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar snap-x">
                        {LEARN_GALLERY.map(item => (
                            <div key={item.id} className="min-w-[220px] snap-start bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col items-center text-center hover:border-amber-200 transition">
                                <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                </div>
                                <h3 className="font-semibold text-gray-900 text-sm mb-1">{item.title}</h3>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.progress === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {item.progress}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* -- Shared Content Grid -- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-gray-200">

                    {/* Recipes */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-gray-900 uppercase tracking-wide text-sm">Shared Recipes</h3>
                        <div className="space-y-3">
                            {RECIPES.map(item => (
                                <div key={item.id} className="flex gap-3 items-center bg-white p-2 rounded-lg shadow-sm border border-gray-100 hover:bg-gray-50 transition cursor-pointer">
                                    <div className="w-12 h-12 rounded-md overflow-hidden relative bg-gray-200 shrink-0">
                                        <Image src={item.image} alt={item.title} fill className="object-cover" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">{item.title}</p>
                                        <p className="text-xs text-red-500">❤️ {item.likes} Likes</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Diet Journeys */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-gray-900 uppercase tracking-wide text-sm">Diet Journeys</h3>
                        <div className="space-y-3">
                            {DIET_JOURNEYS.map(item => (
                                <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition cursor-pointer">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-gray-800 text-sm">{item.title}</h4>
                                        <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{item.date}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 line-clamp-2">{item.preview}</p>
                                    <button className="text-xs text-blue-600 mt-2 font-medium hover:underline">Read more</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Resources */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-gray-900 uppercase tracking-wide text-sm">Resources</h3>
                        {RESOURCES.map(item => (
                            <div key={item.id} className="flex justify-between items-center bg-blue-50/50 p-3 rounded-lg border border-blue-50 hover:bg-blue-50 transition cursor-pointer text-blue-800">
                                <span className="text-sm font-medium">{item.title}</span>
                                <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </div>
                        ))}
                        <button className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-400 hover:text-gray-600 hover:border-gray-400 transition">
                            + Share Resource
                        </button>
                    </div>

                </div>

                {/* Footer Note */}
                <div className="text-center pt-8 pb-4">
                    <p className="text-xs text-gray-400">
                        "The health journey of {user?.email?.split('@')[0]} is documented here to inspire the community."
                    </p>
                </div>
            </div>
        </div>
    );
}
