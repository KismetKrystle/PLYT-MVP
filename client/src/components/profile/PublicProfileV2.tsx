'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileProps {
    user: any;
    isOwner?: boolean; // Optional prop to determine if the viewer is the profile owner
}

// -- Reuse Mock Data from PublicProfile --
const FOOD_GALLERY = [
    { id: 1, title: 'Cherry Tomatoes', image: '/assets/images/gallery/cherry_tomatoes.png', status: 'Harvested' },
    { id: 2, title: 'Organic Kale', image: '/assets/images/gallery/organic_kale.png', status: 'Growing' },
    { id: 3, title: 'Basil', image: '/assets/images/gallery/fresh_herbs.png', status: 'Harvested' },
    { id: 4, title: 'Spinach', image: '/assets/images/gallery/spinach.png', status: 'Planted' },
];

const GROW_GALLERY = [
    { id: 1, title: 'Vertical Hydro Tower', image: '/assets/images/systems/tower.jpg', type: 'Hydroponic', link: '/systems' },
    { id: 2, title: 'NFT System', image: '/assets/images/gallery/hydro_system.png', type: 'Hydroponic', link: '/systems' },
];

const LEARN_GALLERY = [
    { id: 1, title: 'Hydroponics 101', image: '/assets/images/gallery/teaching_garden.png', progress: 'Completed' },
    { id: 2, title: 'Pest Management', image: '/assets/images/gallery/community_garden.png', progress: 'In Progress' },
];

const RECIPES = [
    { id: 1, title: 'Fresh Kale Salad', image: '/assets/images/gallery/organic_kale.png', likes: 124 },
    { id: 2, title: 'Tomato Basil Pasta', image: '/assets/images/gallery/cherry_tomatoes.png', likes: 85 },
];

const DIET_JOURNEYS = [
    { id: 1, title: 'My 30 Day Plant-Based Challenge', date: 'Oct 2024' },
    { id: 2, title: 'Reducing Sugar with Homegrown Stevia', date: 'Sep 2024' },
];

const RESOURCES = [
    { id: 1, title: 'Best Local Seed Banks', link: '#', type: 'Link' },
    { id: 2, title: 'Composting Guide PDF', link: '#', type: 'Document' },
];

const WALL_POSTS = [
    { id: 1, type: 'image', user: 'Urban Gardener', content: 'Just harvested my first batch of hydroponic lettuce! 🥬 #UrbanFarming #Hydroponics', image: '/assets/images/gallery/organic_kale.png', likes: 24, comments: 5, time: '2h ago' },
    { id: 2, type: 'status', user: 'Urban Gardener', content: 'Thinking about expanding to aquaponics next season. Anyone have experience with Tilapia? 🐟', likes: 12, comments: 8, time: '5h ago' },
    { id: 3, type: 'image', user: 'Urban Gardener', content: 'Beautiful sunset over the community garden today. Grateful for this space.', image: '/assets/images/gallery/community_garden.png', likes: 45, comments: 2, time: '1d ago' },
];

export default function PublicProfileV2({ user, isOwner = true }: ProfileProps) {
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const router = useRouter();

    const handleSearch = () => {
        if (!prompt.trim()) return;

        // Save prompt to local storage for the dashboard to pick up
        localStorage.setItem('pendingChatPrompt', JSON.stringify({
            text: prompt,
            tags: [] // box 2 doesn't have tags UI yet, empty for now
        }));

        // Navigate to the Find Produce tab
        router.push('/?tab=find_produce');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    // Common Action Button Component
    const ActionButton = ({ type }: { type: 'edit' | 'like' }) => (
        <button
            className="absolute top-4 right-4 bg-white/30 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/50 transition z-20"
            onClick={(e) => {
                e.stopPropagation();
                if (type === 'edit') console.log('Edit clicked');
                else console.log('Like clicked');
            }}
        >
            {type === 'edit' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            )}
        </button>
    );

    return (
        <div className="w-full h-full overflow-y-auto bg-gray-50 p-4 md:p-8 no-scrollbar relative">
            <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-min">

                {/* -- Box 1: Identity (Row 1, Col 1-2) -- */}
                <div className="col-span-2 md:col-span-2 bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 transition-all duration-300 flex items-center gap-6 relative overflow-hidden group">
                    {isOwner && <ActionButton type="edit" />}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-white shadow-lg overflow-hidden shrink-0 relative z-10">
                        <Image
                            src="/assets/images/gallery/user_avatar.png"
                            alt="Profile Avatar"
                            fill
                            className="object-cover"
                        />
                    </div>
                    <div className="relative z-10">
                        <h1 className="text-2xl font-bold text-gray-900">{user?.email?.split('@')[0] || 'Urban Gardener'}</h1>
                        <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                            Passionate about sustainable living. Join me on my journey! 🌱
                        </p>
                        <Link href="/?tab=impact" className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-full hover:bg-green-100 transition-colors">
                            View Impact Score
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </Link>
                    </div>
                </div>

                {/* -- Box 2: AI Prompt (Row 1, Col 3-4) -- */}
                <div className="col-span-2 md:col-span-2 bg-gradient-to-br from-green-600 to-emerald-700 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,128,0,0.15)] hover:shadow-[0_8px_30px_rgb(0,128,0,0.25)] transition-all duration-300 text-white flex flex-col justify-center relative overflow-hidden">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl -ml-8 -mb-8"></div>

                    <label className="text-green-100 text-sm font-semibold mb-3 uppercase tracking-wider relative z-10">AI Assistant</label>
                    <div className="relative z-10">
                        <div className="bg-white/20 backdrop-blur-md rounded-2xl p-1 flex items-center border border-white/30">
                            <div className="p-2 text-white/70">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                            <input
                                type="text"
                                placeholder="How can I assist you today?"
                                className="bg-transparent border-none outline-none text-white placeholder:text-white/70 w-full text-sm px-2"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            <button
                                onClick={handleSearch}
                                className="bg-white text-green-700 p-2 rounded-xl hover:bg-green-50 transition shadow-sm"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* -- Box 3: Stats (Row 2, Col 1) -- */}
                {/* -- Box 3: Stats (Row 2, Col 1) -- */}
                <Link href="/impact" className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 transition-all duration-300 flex flex-col justify-center items-center text-center hover:border-green-400 cursor-pointer group">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider group-hover:text-green-600 transition-colors">Impact Points</p>
                    <p className="text-5xl font-extrabold text-gray-900 mt-2 group-hover:scale-110 transition-transform">850</p>
                    <p className="text-xs text-green-600 font-medium mt-2 bg-green-50 px-2 py-1 rounded-full">Top 5% in Region</p>
                </Link>

                {/* -- Box 4: Food I Eat (Row 2, Col 2-4) -- */}
                <div
                    onClick={() => setActiveModal('food')}
                    className="md:col-span-3 bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 transition-all duration-300 relative overflow-hidden group cursor-pointer"
                >
                    <ActionButton type={isOwner ? 'edit' : 'like'} />
                    {/* Background Image (Cover) */}
                    <div className="absolute inset-0">
                        <Image
                            src={FOOD_GALLERY[0].image}
                            alt="Food Cover"
                            fill
                            className="object-cover group-hover:scale-105 transition duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                    </div>

                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <h3 className="font-extrabold text-white flex items-center gap-2 text-3xl shadow-sm tracking-tight">
                                <span className="w-3 h-3 bg-green-500 rounded-full box-shadow-green shadow-[0_0_10px_rgba(34,197,94,0.8)]"></span>
                                Food I Eat
                            </h3>
                            <button className="text-xs text-white/90 hover:text-white bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/30 transition-colors">View All (4)</button>
                        </div>
                        <div>
                            <p className="text-white text-2xl font-bold border-l-4 border-green-500 pl-3">{FOOD_GALLERY[0].title}</p>
                            <p className="text-white/80 text-sm mt-1 pl-4">{FOOD_GALLERY[0].status} • +3 others</p>
                        </div>
                    </div>
                </div>

                {/* -- Box 5: How I Grow (Vertical) -- */}
                <div
                    onClick={() => setActiveModal('grow')}
                    className="col-span-1 md:col-span-1 md:row-span-2 bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 transition-all duration-300 relative overflow-hidden group cursor-pointer"
                >
                    <ActionButton type={isOwner ? 'edit' : 'like'} />
                    <div className="absolute inset-0">
                        <Image
                            src={GROW_GALLERY[0].image}
                            alt="Grow Cover"
                            fill
                            className="object-cover group-hover:scale-105 transition duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                    </div>

                    <div className="relative z-10 h-full flex flex-col justify-between" style={{ minHeight: '160px' }}>
                        <h3 className="font-extrabold text-white flex items-center gap-2 text-3xl tracking-tight leading-none">
                            <span className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)] shrink-0"></span>
                            How <br /> I Grow
                        </h3>
                        <div>
                            <p className="text-white text-xl font-bold border-l-4 border-blue-500 pl-3">{GROW_GALLERY[0].title}</p>
                            <p className="text-white/80 text-sm pl-4">{GROW_GALLERY[0].type}</p>
                        </div>
                    </div>
                </div>

                {/* -- Box 5b: Favorite Quote / Status (Mobile Gap Filler) -- */}
                {/*  Next to 'How I Grow' on Mobile, stacked elsewhere on Desktop if needed  */}
                <div className="col-span-1 md:col-span-1 md:row-span-1 bg-white rounded-3xl p-6 relative overflow-hidden flex flex-col justify-center items-center text-center group">
                    {isOwner && (
                        <button className="absolute top-2 right-2 text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                    )}
                    <div className="absolute top-0 right-0 text-9xl text-gray-100 -mr-4 -mt-8 font-serif">"</div>
                    <p className="text-gray-800 font-serif italic text-sm md:text-base relative z-10">
                        "To plant a garden is to believe in tomorrow."
                    </p>
                    <p className="text-gray-400 text-xs mt-3 uppercase tracking-wider font-bold">- Audrey Hepburn</p>
                </div>

                {/* -- Box 6: What I've Learned (Row 3, Col 3-4) -- */}
                <div
                    onClick={() => setActiveModal('learn')}
                    className="col-span-2 md:col-span-2 bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 transition-all duration-300 cursor-pointer group"
                >
                    <ActionButton type={isOwner ? 'edit' : 'like'} />
                    <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                        <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                        What I've Learned
                    </h3>
                    <div className="space-y-3">
                        {LEARN_GALLERY.map(item => (
                            <div key={item.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition">
                                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
                                    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                                        <div className={`h-1.5 rounded-full ${item.progress === 'Completed' ? 'bg-green-500 w-full' : 'bg-amber-400 w-2/3'}`}></div>
                                    </div>
                                </div>
                                <span className="text-[10px] text-gray-400 font-medium">{item.progress}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* -- Box 7: Recipes (Row 4, Col 1) -- */}
                <div
                    onClick={() => setActiveModal('recipes')}
                    className="bg-white rounded-3xl p-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 transition-all duration-300 overflow-hidden group relative cursor-pointer"
                >
                    <ActionButton type={isOwner ? 'edit' : 'like'} />
                    <div className="absolute inset-0">
                        <Image
                            src={RECIPES[0].image}
                            alt="Recipe Cover"
                            fill
                            className="object-cover group-hover:scale-105 transition duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                    </div>
                    <div className="relative z-10 p-6 h-full flex flex-col justify-end" style={{ minHeight: '220px' }}>
                        <h3 className="font-extrabold text-white flex items-center gap-2 text-3xl shadow-sm tracking-tight mb-2">
                            <span className="w-3 h-3 bg-yellow-400 rounded-full shadow-[0_0_10px_rgba(250,204,21,0.8)]"></span>
                            Recipes
                        </h3>
                        <p className="text-white text-lg font-bold leading-tight mb-1 border-l-4 border-yellow-400 pl-3">{RECIPES[0].title}</p>
                        <p className="text-white/70 text-xs pl-4">❤️ {RECIPES[0].likes} Likes</p>
                    </div>
                </div>

                {/* -- Box 8: Diet Journeys (Row 4, Col 2) -- */}
                <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 transition-all duration-300">
                    <h3 className="font-bold text-gray-900 text-sm mb-4 uppercase tracking-wide">Journeys</h3>
                    <div className="space-y-4">
                        {DIET_JOURNEYS.map(item => (
                            <div key={item.id} className="border-l-2 border-purple-100 pl-3 py-1">
                                <p className="text-[10px] text-purple-600 font-bold mb-0.5">{item.date}</p>
                                <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug hover:text-purple-700 cursor-pointer">{item.title}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* -- Box 9: Wall of Posts (Feed) -- */}
                <div className="col-span-2 md:col-span-4 bg-transparent rounded-3xl p-0 mt-4 flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-bold text-gray-900">Community Wall</h3>
                        <button className="text-sm font-semibold text-green-600 bg-white px-4 py-2 rounded-full shadow-sm hover:shadow-md transition">Create Post +</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {WALL_POSTS.map(post => (
                            <div key={post.id} className="bg-white rounded-3xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 transition-all duration-300 flex flex-col h-full">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-green-100 overflow-hidden relative border border-gray-100">
                                        <Image src="/assets/images/gallery/user_avatar.png" alt="User" fill className="object-cover" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{post.user}</p>
                                        <p className="text-[10px] text-gray-400">{post.time}</p>
                                    </div>
                                </div>

                                {post.image && (
                                    <div className="aspect-video relative rounded-2xl overflow-hidden mb-3 shadow-inner">
                                        <Image src={post.image} alt="Post content" fill className="object-cover" />
                                    </div>
                                )}

                                <p className="text-sm text-gray-700 leading-relaxed mb-4 flex-grow">
                                    {post.content}
                                </p>

                                <div className="flex items-center gap-4 border-t border-gray-100 pt-3 mt-auto">
                                    <button className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-red-500 transition">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                                        {post.likes}
                                    </button>
                                    <button className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-blue-500 transition">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                        {post.comments}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            <div className="text-center mt-8 pb-4 flex flex-col items-center gap-2">
                <p className="text-xs text-gray-300 font-medium">Bento Grid Layout v1.0</p>
            </div>

            {/* -- Expanded Content Modal -- */}
            <AnimatePresence>
                {activeModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setActiveModal(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                                <h2 className="text-2xl font-bold text-gray-900">
                                    {activeModal === 'food' && 'Food I Eat'}
                                    {activeModal === 'grow' && 'My Systems'}
                                    {activeModal === 'recipes' && 'Shared Recipes'}
                                    {activeModal === 'learn' && 'Learning & Resources'}
                                </h2>
                                <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-gray-100 rounded-full transition">
                                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            {/* Content Scroller */}
                            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                                {activeModal === 'food' && (
                                    <div className="flex flex-col gap-6">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                            {FOOD_GALLERY.map(item => (
                                                <div key={item.id} className="group cursor-pointer">
                                                    <div className="aspect-square relative rounded-xl overflow-hidden mb-3 shadow-md">
                                                        <Image src={item.image} alt={item.title} fill className="object-cover group-hover:scale-105 transition duration-500" />
                                                        <div className="absolute top-2 right-2 bg-white/90 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide text-green-800 backdrop-blur-sm shadow-sm">{item.status}</div>
                                                    </div>
                                                    <h3 className="font-bold text-gray-900">{item.title}</h3>
                                                    <p className="text-xs text-gray-400">Harvested 2 days ago</p>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-4 pt-6 border-t border-gray-100 flex justify-center">
                                            <Link
                                                href="/?tab=find_produce"
                                                className="inline-flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                                Order More Food
                                            </Link>
                                        </div>
                                    </div>
                                )}

                                {activeModal === 'grow' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {GROW_GALLERY.map(item => (
                                            <Link href={item.link} key={item.id} className="block relative aspect-video rounded-2xl overflow-hidden group shadow-md cursor-pointer hover:ring-4 hover:ring-green-500/30 transition-all">
                                                <Image src={item.image} alt={item.title} fill className="object-cover group-hover:scale-105 transition duration-500" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6">
                                                    <h3 className="text-white text-xl font-bold flex items-center gap-2">
                                                        {item.title}
                                                        <svg className="w-5 h-5 text-green-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                    </h3>
                                                    <p className="text-white/80">{item.type}</p>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}

                                {activeModal === 'recipes' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {RECIPES.map(item => (
                                            <div key={item.id} className="flex gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-lg transition cursor-pointer group">
                                                <div className="w-24 h-24 rounded-xl overflow-hidden relative shrink-0">
                                                    <Image src={item.image} alt={item.title} fill className="object-cover" />
                                                </div>
                                                <div className="flex flex-col justify-center">
                                                    <h3 className="font-bold text-gray-900 group-hover:text-green-600 transition">{item.title}</h3>
                                                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">A delicious and healthy recipe featuring fresh ingredients from the garden.</p>
                                                    <p className="text-xs text-red-500 font-medium mt-2">❤️ {item.likes} Likes</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {activeModal === 'learn' && (
                                    <div className="space-y-8">
                                        {/* Certifications / Progress */}
                                        <div>
                                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                                                Active Learning
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {LEARN_GALLERY.map(item => (
                                                    <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50">
                                                        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 font-bold">
                                                            {item.progress === 'Completed' ? '✓' : '%'}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-gray-900">{item.title}</h4>
                                                            <p className="text-sm text-gray-500">{item.progress}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Resources Section */}
                                        <div>
                                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                                My Resources
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {RESOURCES.map(item => (
                                                    <Link href={item.link} key={item.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-200 transition group">
                                                        <div className="w-10 h-10 rounded-lg bg-white text-blue-500 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition">
                                                            {item.type === 'Link' ? (
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                                            ) : (
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-gray-900 group-hover:text-blue-700 transition">{item.title}</h4>
                                                            <p className="text-xs text-blue-400 font-medium uppercase tracking-wide">{item.type}</p>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
