'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';

// Mock data for the ticker items
// In the future, this will be fetched from the backend
const MARKET_ITEMS = [
    { id: 1, name: 'Organic Kale', type: 'Produce', price: 'Rp 15k/kg', image: '/images/organic-kale.png' },
    { id: 2, name: 'Hydro-Kit V1', type: 'System', price: 'Rp 1.2M', image: '/images/hydro-system.png' },
    { id: 3, name: 'Red Spinach', type: 'Produce', price: 'Rp 12k/kg', image: '/images/organic-kale.png' }, // Placeholder reuse
    { id: 4, name: 'Starter Seeds', type: 'System', price: 'Rp 45k', image: '/images/nutrient-mix.png' }, // Placeholder reuse
    { id: 5, name: 'Bok Choy', type: 'Produce', price: 'Rp 18k/kg', image: '/images/organic-kale.png' }, // Placeholder reuse
    { id: 6, name: 'Nutrient Mix A+B', type: 'System', price: 'Rp 85k', image: '/images/nutrient-mix.png' },
    { id: 7, name: 'Cherry Tomatoes', type: 'Produce', price: 'Rp 25k/kg', image: '/images/cherry-tomatoes.png' },
    { id: 8, name: 'Grow Light 50W', type: 'System', price: 'Rp 350k', image: '/images/hydro-system.png' }, // Placeholder reuse
    { id: 9, name: 'Fresh Basil', type: 'Produce', price: 'Rp 20k/bunch', image: '/images/organic-kale.png' }, // Placeholder reuse
    { id: 10, name: 'Auto-Watering Timer', type: 'System', price: 'Rp 150k', image: '/images/hydro-system.png' }, // Placeholder reuse
];

interface MarketTickerProps {
    onItemClick: (item: string) => void;
}

export default function MarketTicker({ onItemClick }: MarketTickerProps) {
    // Duplicate items to ensure smooth loop
    const duplicatedItems = [...MARKET_ITEMS, ...MARKET_ITEMS, ...MARKET_ITEMS];

    return (
        <div className="w-full overflow-hidden py-6 bg-white/50 backdrop-blur-sm border-t border-b border-gray-100/50">
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
                        className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-green-200 hover:-translate-y-1 transition-all duration-300 min-w-[220px] text-left group"
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
                            <span className="text-xs font-mono text-gray-500 group-hover:text-gray-900 transition-colors">
                                {item.price}
                            </span>
                        </div>
                    </button>
                ))}
            </motion.div>
        </div>
    );
}
