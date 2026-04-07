'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';

type MarketItem = {
    id: number;
    name: string;
    type: string;
    image: string;
    price?: string;
    savedCount?: number;
};

// Mock data for the ticker items
// In the future, this will be fetched from the backend
const MARKET_ITEMS: MarketItem[] = [
    { id: 1, name: 'Organic Kale', type: 'Produce', price: 'Rp 15k/kg', image: '/images/organic-kale.png' },
    { id: 2, name: 'Takeout Grain Bowl', type: 'Cooked', price: '$9.56', image: '/assets/images/gallery/takeout.jpeg' },
    { id: 3, name: 'Red Spinach', type: 'Produce', price: 'Rp 12k/kg', image: '/images/organic-kale.png' },
    { id: 4, name: 'Prepared Ingredients', type: 'Receipes', savedCount: 128, image: '/assets/images/gallery/receipe.jpeg' },
    { id: 5, name: 'Bok Choy', type: 'Produce', price: 'Rp 18k/kg', image: '/images/organic-kale.png' },
    { id: 6, name: 'Expert', type: 'Alkaline Diet', price: 'Bali, Indonesia', image: '/assets/images/gallery/expert.jpeg' },
    { id: 7, name: 'Cherry Tomatoes', type: 'Produce', price: 'Rp 25k/kg', image: '/images/cherry-tomatoes.png' },
    { id: 10, name: 'Auto-Watering Timer', type: 'System', price: 'Rp 150k', image: '/images/hydro-system.png' },
];

interface MarketTickerProps {
    onItemClick: (item: string) => void;
}

export default function MarketTicker({ onItemClick }: MarketTickerProps) {
    // Duplicate items to ensure smooth loop
    const duplicatedItems = [...MARKET_ITEMS, ...MARKET_ITEMS, ...MARKET_ITEMS];

    return (
        <div className="w-full overflow-hidden border-y border-gray-100/50 bg-white/50 py-4 backdrop-blur-sm md:py-6">
            <motion.div
                className="flex gap-4 w-max"
                animate={{
                    x: ['0%', '-33.33%'], // Move by one-third of the total width (since we have 3 sets)
                }}
                transition={{
                    duration: 40, // Slower speed for better viewing of images
                    ease: 'linear',
                    repeat: Infinity,
                }}
            >
                {duplicatedItems.map((item, index) => (
                    <button
                        key={`${item.id}-${index}`}
                        onClick={() => onItemClick(item.name)}
                        className="group flex min-w-[180px] items-center gap-3 rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-green-200 hover:shadow-md md:min-w-[220px] md:px-4 md:py-3"
                    >
                        {/* Image Container */}
                        <div className="w-16 h-16 shrink-0 relative rounded-lg overflow-hidden bg-gray-50 border border-gray-100 group-hover:border-green-100 transition-colors">
                            <Image
                                src={item.image}
                                alt={item.name}
                                fill
                                className="object-cover p-1"
                                sizes="64px"
                            />
                        </div>

                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 group-hover:text-green-500 transition-colors">
                                {item.type}
                            </span>
                            <span className="text-sm font-semibold text-gray-800 my-0.5 line-clamp-1">
                                {item.name}
                            </span>
                            {typeof item.savedCount === 'number' ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 transition-colors group-hover:text-gray-900">
                                    <svg className="h-3.5 w-3.5 text-rose-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                        <path d="M10 17.25l-1.45-1.32C4.4 12.15 2 9.98 2 7.31 2 5.14 3.72 3.5 5.8 3.5c1.18 0 2.31.55 3.02 1.42A3.91 3.91 0 0111.84 3.5C13.92 3.5 15.64 5.14 15.64 7.31c0 2.67-2.4 4.84-6.55 8.62L10 17.25z" />
                                    </svg>
                                    {item.savedCount}
                                </span>
                            ) : (
                                <span className="text-xs font-mono text-gray-500 group-hover:text-gray-900 transition-colors">
                                    {item.price}
                                </span>
                            )}
                        </div>
                    </button>
                ))}
            </motion.div>
        </div>
    );
}
