'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/auth';
import { useLessons } from '../context/LessonContext';
import Logo from './Logo';
import { useState } from 'react';
import RightSidebar from './RightSidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { logout, user, loading } = useAuth();
    const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
    const [isDesktopOpen, setIsDesktopOpen] = useState(true);
    const [isLessonsOpen, setIsLessonsOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    // 1. Auth & Loading Guard
    // If loading, show nothing (or spinner)
    if (loading) return <div className="min-h-screen bg-white"></div>;
    // If not authenticated, render children without layout (Login, Landing)
    if (!user) return <>{children}</>;

    // Updated Navigation Items per User Request
    const NAV_ITEMS = [
        {
            name: 'Home', href: '/', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            )
        },
        {
            name: 'Lessons', href: '/lessons', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            )
        },
        {
            name: 'Your Systems', href: '/systems', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m8-10a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            )
        },
        {
            name: 'Impact Score', href: '/impact', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            )
        },
        {
            name: 'Store', href: '/store', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
            )
        },
        {
            name: 'Orders', href: '/orders', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            )
        },
    ];

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden relative">

            {/* Mobile Overlay (Backdrop) */}
            {leftSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-20 md:hidden backdrop-blur-sm"
                    onClick={() => setLeftSidebarOpen(false)}
                />
            )}

            {/* LEFT SIDEBAR - Desktop & Mobile Drawer */}
            <aside className={`
                fixed inset-y-0 left-0 z-30 bg-white border-r border-gray-200 transform transition-all duration-300 ease-in-out flex flex-col shadow-xl md:shadow-none
                ${leftSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                md:translate-x-0 md:static
                ${isDesktopOpen ? 'md:w-64' : 'md:w-0 md:overflow-hidden'}
            `}>
                <div className={`p-6 flex justify-between items-center shrink-0 ${!isDesktopOpen && 'hidden md:flex'}`}>
                    {/* Logo - Hide if desktop closed (handled by overflow:hidden, but extra safety) */}
                    <div className="min-w-[100px]">
                        <Logo variant="dark" width={100} />
                    </div>
                    <button onClick={() => setLeftSidebarOpen(false)} className="md:hidden text-gray-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Scrollable Navigation + Resources */}
                <div className="flex-1 overflow-y-auto no-scrollbar w-64">
                    {/* Width fixed to 64px internally to prevent content squishing during transition */}
                    <nav className="px-4 space-y-2 mt-2">
                        {NAV_ITEMS.map((item) => {
                            const isActive = pathname === item.href;
                            const isLessons = item.name === 'Lessons';
                            const { savedLessons, activeLesson, setActiveLesson } = useLessons();

                            if (isLessons) {
                                return (
                                    <div key={item.name} className="flex flex-col">
                                        <button
                                            onClick={() => setIsLessonsOpen(!isLessonsOpen)}
                                            className={`flex items-center justify-between w-full px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${isActive || isLessonsOpen
                                                ? 'bg-green-50 text-green-700 shadow-sm border border-green-100'
                                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                                                }`}
                                        >
                                            <div className="flex items-center">
                                                <div className={`mr-3 transition-colors ${isActive || isLessonsOpen ? 'text-green-600' : 'text-gray-400 group-hover:text-gray-500'}`}>
                                                    {item.icon}
                                                </div>
                                                {item.name}
                                            </div>
                                            <svg
                                                className={`w-4 h-4 transition-transform duration-200 ${isLessonsOpen ? 'rotate-180' : ''}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isLessonsOpen ? 'max-h-48 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                                            <div className="pl-11 pr-2 space-y-1">
                                                {savedLessons.map((lesson) => (
                                                    <div
                                                        key={lesson.id}
                                                        className={`px-3 py-2 text-xs font-medium rounded-lg hover:bg-gray-50 hover:text-green-600 cursor-pointer truncate transition-colors border border-transparent hover:border-gray-100 ${activeLesson?.id === lesson.id ? 'text-green-600 bg-green-50 shadow-sm' : 'text-gray-500'
                                                            }`}
                                                        onClick={() => {
                                                            setActiveLesson(lesson);
                                                            setLeftSidebarOpen(false);
                                                        }}
                                                    >
                                                        {lesson.title}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setLeftSidebarOpen(false)}
                                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${isActive
                                        ? 'bg-green-50 text-green-700 shadow-sm border border-green-100'
                                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                                        }`}
                                >
                                    <div className={`mr-3 transition-colors ${isActive ? 'text-green-600' : 'text-gray-400 group-hover:text-gray-500'}`}>
                                        {item.icon}
                                    </div>
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Separator */}
                    <div className="mx-4 my-2 border-t border-gray-100"></div>

                    {/* Resources Panel (Formerly Right Sidebar) */}
                    <RightSidebar />
                </div>

                {/* Bottom Spacer/Footer (Optional) */}
                <div className="p-4 border-t border-gray-100 shrink-0 bg-white z-10 w-64 text-center text-xs text-gray-300">
                    <p>PLYT v0.1.0 Beta</p>
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col min-w-0 h-full relative transition-all duration-300">

                {/* Top Header */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 z-10 shrink-0 gap-4">

                    {/* Left: Mobile Menu + Desktop Toggle */}
                    <div className="flex items-center gap-2">
                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setLeftSidebarOpen(true)}
                            className="md:hidden text-gray-500 hover:bg-gray-100 p-2 rounded-lg"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>

                        {/* Desktop Toggle Button */}
                        <button
                            onClick={() => setIsDesktopOpen(!isDesktopOpen)}
                            className="hidden md:block text-gray-500 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                            title={isDesktopOpen ? "Collapse Sidebar" : "Expand Sidebar"}
                        >
                            {isDesktopOpen ? (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                            ) : (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                            )}
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="flex-1 max-w-md bg-gray-100 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-green-500/20 transition-all flex items-center">
                        <svg className="w-5 h-5 text-gray-400 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input
                            type="text"
                            placeholder="Search..."
                            className="bg-transparent border-none outline-none text-sm w-full placeholder:text-gray-400 text-gray-700 min-w-[100px]"
                        />
                    </div>

                    {/* Wallet Widget & Profile */}
                    <div className="flex items-center gap-3 md:gap-6">
                        <div className="hidden sm:flex flex-col items-end">
                            <div className="flex items-baseline gap-2">
                                <span className="font-bold text-gray-900 text-sm md:text-lg">1,250</span>
                                <span className="text-gray-400 text-xs font-medium hidden md:inline">≈ $12.50</span>
                            </div>
                            <button className="text-green-600 text-[10px] font-bold uppercase tracking-wide hover:underline hover:text-green-700 transition">
                                Wallet
                            </button>
                        </div>

                        {/* Profile Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="w-10 h-10 rounded-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center text-green-800 font-bold text-sm shadow-inner hover:ring-2 hover:ring-green-500/20 transition-all border border-green-100"
                            >
                                {user?.email?.[0].toUpperCase() || 'U'}
                            </button>

                            {/* Dropdown Menu */}
                            {isProfileOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-30"
                                        onClick={() => setIsProfileOpen(false)}
                                    />
                                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 divide-y divide-gray-100 z-40 overflow-hidden text-sm animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="px-4 py-3 bg-gray-50/50">
                                            <p className="text-sm font-medium text-gray-900 truncate">Kismet</p>
                                            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                                        </div>
                                        <div className="py-1">
                                            <Link
                                                href="/admin"
                                                onClick={() => setIsProfileOpen(false)}
                                                className="flex items-center gap-2 px-4 py-2.5 text-gray-700 hover:bg-gray-50 hover:text-green-600 transition-colors"
                                            >
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                Admin Dashboard
                                            </Link>
                                            <a href="#" className="flex items-center gap-2 px-4 py-2.5 text-gray-700 hover:bg-gray-50 hover:text-green-600 transition-colors">
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                Settings
                                            </a>
                                        </div>
                                        <div className="py-1 bg-red-50/30">
                                            <button
                                                onClick={logout}
                                                className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                                Sign Out
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Scrollable Main Content Layout */}
                <main className="flex-1 overflow-hidden relative flex flex-row">
                    {/* Child Page Content */}
                    <div className="flex-1 overflow-y-auto bg-gray-50 relative">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
