'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';

type Props = {
    user: any;
};

type FeedItem = {
    id: number;
    type: 'image' | 'video';
    title: string;
    caption: string;
    mediaUrl: string;
    postedAt: string;
};

const journeyFeed: FeedItem[] = [
    {
        id: 1,
        type: 'image',
        title: 'Week 1: Fresh Start',
        caption: 'Swapped processed snacks for fresh fruit + nuts.',
        mediaUrl: '/assets/images/gallery/cherry_tomatoes.png',
        postedAt: '2 days ago'
    },
    {
        id: 2,
        type: 'image',
        title: 'Local Market Haul',
        caption: 'Picked up spinach, basil, and red carrots from local growers.',
        mediaUrl: '/assets/images/gallery/organic_kale.png',
        postedAt: '4 days ago'
    },
    {
        id: 3,
        type: 'video',
        title: 'Meal Prep Session',
        caption: '30-minute prep for 3 healthy lunches.',
        mediaUrl: '/assets/images/gallery/teaching_garden.png',
        postedAt: '1 week ago'
    }
];

const pinnedArticles = [
    { id: 1, title: '10 Anti-Inflammatory Foods to Add This Week', author: 'A. Monroe' },
    { id: 2, title: 'How to Build a Realistic Plant-Forward Plate', author: 'J. Patel, RD' },
    { id: 3, title: 'Local Seasonal Eating Guide: Spring Edition', author: 'PLYT Community' }
];

const resourceLinks = [
    { id: 1, label: 'Raw Food Starter Guide', href: '#' },
    { id: 2, label: 'Community Farm Map', href: '#' },
    { id: 3, label: 'Weekly Shopping Checklist', href: '#' }
];

const uploadedFiles = [
    { id: 1, name: 'lab-results-mar-2026.pdf', size: '1.2 MB' },
    { id: 2, name: 'food-intolerance-notes.docx', size: '220 KB' }
];

const favoritedExperts = [
    { id: 1, name: 'Dr. Jane Smith', specialty: 'Gut Health' },
    { id: 2, name: 'Marcus Lee, CNS', specialty: 'Plant-Based Nutrition' },
    { id: 3, name: 'Dr. Nora Kim', specialty: 'Metabolic Wellness' }
];

const weekMeals = [
    { day: 'Mon', breakfast: 'Berry oats', lunch: 'Kale salad', dinner: 'Lentil bowl' },
    { day: 'Tue', breakfast: 'Green smoothie', lunch: 'Quinoa bowl', dinner: 'Veg stir-fry' },
    { day: 'Wed', breakfast: 'Chia pudding', lunch: 'Chickpea wrap', dinner: 'Miso veggies' },
    { day: 'Thu', breakfast: 'Fruit + nuts', lunch: 'Avocado toast', dinner: 'Bean chili' },
    { day: 'Fri', breakfast: 'Overnight oats', lunch: 'Buddha bowl', dinner: 'Herb pasta' },
    { day: 'Sat', breakfast: 'Smoothie bowl', lunch: 'Garden salad', dinner: 'Roasted veggies' },
    { day: 'Sun', breakfast: 'Yogurt + seeds', lunch: 'Soup + greens', dinner: 'Meal prep night' }
];

const foodCart = [
    { id: 1, item: 'Organic Kale', qty: 2, unit: 'bundle', price: 14 },
    { id: 2, item: 'Cherry Tomatoes', qty: 1, unit: 'kg', price: 25 },
    { id: 3, item: 'Fresh Basil', qty: 3, unit: 'bundle', price: 9 }
];

const foodHistory = [
    { id: 1, order: '#F-2098', date: '2026-02-20', summary: 'Kale, spinach, basil', total: 39 },
    { id: 2, order: '#F-2051', date: '2026-02-14', summary: 'Tomatoes, carrots, lettuce', total: 48 },
    { id: 3, order: '#F-1972', date: '2026-02-02', summary: 'Bok choy, herbs, sprouts', total: 31 }
];

function Card({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
            <div className="mt-4">{children}</div>
        </section>
    );
}

export default function CustomerProfileDashboard({ user }: Props) {
    const [avatar, setAvatar] = useState<string>(user?.avatar_url || '/assets/images/gallery/user_avatar.png');
    const [healthyDays] = useState(42);
    const [walletBalance] = useState(1250);

    const cartTotal = useMemo(
        () => foodCart.reduce((sum, row) => sum + (row.price * row.qty), 0),
        []
    );

    const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const localUrl = URL.createObjectURL(file);
        setAvatar(localUrl);
    };

    return (
        <div className="mx-auto w-full max-w-7xl p-4 md:p-8">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <section className="rounded-3xl border border-green-100 bg-gradient-to-br from-white to-green-50 p-6 shadow-sm md:col-span-3">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                        <div className="relative h-24 w-24 overflow-hidden rounded-2xl border border-white shadow">
                            <Image src={avatar} alt="Customer profile" fill className="object-cover" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-gray-900">{user?.name || user?.email?.split('@')[0] || 'Customer Profile'}</h2>
                            <p className="mt-1 text-sm text-gray-600">
                                Track your health journey, organize your food plans, and stay connected to trusted experts.
                            </p>
                            <label className="mt-3 inline-flex cursor-pointer rounded-xl bg-white px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50">
                                Update Profile Photo
                                <input type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
                            </label>
                        </div>
                    </div>
                </section>

                <Card title="Healthy Day Streak">
                    <p className="text-4xl font-extrabold text-green-600">{healthyDays}</p>
                    <p className="mt-1 text-sm text-gray-500">Days of consistent healthy choices</p>
                </Card>

                <Card title="Wellness Journey Feed">
                    <div className="space-y-3">
                        {journeyFeed.map((item) => (
                            <article key={item.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                                <div className="mb-2 relative h-28 w-full overflow-hidden rounded-lg">
                                    <Image src={item.mediaUrl} alt={item.title} fill className="object-cover" />
                                </div>
                                <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                                <p className="text-xs text-gray-600 mt-1">{item.caption}</p>
                                <p className="text-[11px] text-gray-400 mt-1">{item.type.toUpperCase()} • {item.postedAt}</p>
                            </article>
                        ))}
                    </div>
                </Card>

                <Card title="Resource Area">
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Files</p>
                            <ul className="mt-2 space-y-1">
                                {uploadedFiles.map((file) => (
                                    <li key={file.id} className="text-sm text-gray-700">{file.name} <span className="text-xs text-gray-400">({file.size})</span></li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Links</p>
                            <ul className="mt-2 space-y-1">
                                {resourceLinks.map((link) => (
                                    <li key={link.id}><a href={link.href} className="text-sm text-green-700 hover:underline">{link.label}</a></li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Pinned Articles</p>
                            <ul className="mt-2 space-y-1">
                                {pinnedArticles.map((article) => (
                                    <li key={article.id} className="text-sm text-gray-700">{article.title} <span className="text-xs text-gray-400">by {article.author}</span></li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </Card>

                <Card title="Favorited Experts">
                    <ul className="space-y-2">
                        {favoritedExperts.map((expert) => (
                            <li key={expert.id} className="rounded-lg border border-gray-200 p-3">
                                <p className="text-sm font-semibold text-gray-900">{expert.name}</p>
                                <p className="text-xs text-gray-500">{expert.specialty}</p>
                            </li>
                        ))}
                    </ul>
                </Card>

                <Card title="Meal Plan Calendar">
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        {weekMeals.map((day) => (
                            <div key={day.day} className="rounded-lg border border-gray-200 p-3">
                                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{day.day}</p>
                                <p className="text-sm text-gray-700 mt-1">B: {day.breakfast}</p>
                                <p className="text-sm text-gray-700">L: {day.lunch}</p>
                                <p className="text-sm text-gray-700">D: {day.dinner}</p>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card title="Food Cart">
                    <div className="space-y-2">
                        {foodCart.map((row) => (
                            <div key={row.id} className="flex items-center justify-between text-sm">
                                <span className="text-gray-700">{row.item} ({row.qty} {row.unit})</span>
                                <span className="font-semibold text-gray-900">{row.price * row.qty} PLYT</span>
                            </div>
                        ))}
                        <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-700">Total</span>
                            <span className="text-sm font-bold text-green-700">{cartTotal} PLYT</span>
                        </div>
                    </div>
                </Card>

                <Card title="Food History">
                    <ul className="space-y-2">
                        {foodHistory.map((order) => (
                            <li key={order.id} className="rounded-lg border border-gray-200 p-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-gray-900">{order.order}</p>
                                    <p className="text-xs text-gray-500">{order.date}</p>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{order.summary}</p>
                                <p className="text-xs font-semibold text-green-700 mt-1">{order.total} PLYT</p>
                            </li>
                        ))}
                    </ul>
                </Card>

                <Card title="Wallet Balance">
                    <p className="text-3xl font-extrabold text-gray-900">{walletBalance} PLYT</p>
                    <p className="mt-1 text-sm text-gray-500">Available for food orders, subscriptions, and services.</p>
                </Card>
            </div>
        </div>
    );
}

