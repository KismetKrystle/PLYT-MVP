'use client';

import { useState } from 'react';

export default function StorePage() {
    const [category, setCategory] = useState('All');

    const CATEGORIES = ['All', 'Systems', 'Produce', 'Seeds', 'Nutrients'];

    const PRODUCTS = [
        { id: 1, name: "Hydro-Starter Kit", price: 1200000, category: "Systems", image: "" },
        { id: 2, name: "Organic Kale", price: 35000, category: "Produce", image: "" },
        { id: 3, name: "Liquid Gold Nutrient A+B", price: 150000, category: "Nutrients", image: "" },
        { id: 4, name: "Thai Basil Seeds", price: 25000, category: "Seeds", image: "" },
        { id: 5, name: "Vertical Tower V2", price: 3500000, category: "Systems", image: "" },
        { id: 6, name: "Cherry Tomatoes", price: 28000, category: "Produce", image: "" },
    ];

    const filtered = category === 'All' ? PRODUCTS : PRODUCTS.filter(p => p.category === category);

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Marketplace</h1>

            {/* Filter Bar */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`px-5 py-2 rounded-full text-sm font-semibold transition whitespace-nowrap ${category === cat
                            ? 'bg-green-600 text-white shadow-lg shadow-green-200'
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filtered.map(product => (
                    <div key={product.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition group overflow-hidden">
                        <div className="aspect-square bg-gray-100 relative">
                            {/* Image Placeholder */}
                            <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                                <span className="text-xs uppercase">{product.category}</span>
                            </div>
                        </div>
                        <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-bold text-gray-900 group-hover:text-green-600 transition">{product.name}</h3>
                                    <p className="text-xs text-gray-500">{product.category}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-4">
                                <span className="font-bold text-gray-900">Rp {product.price.toLocaleString()}</span>
                                <button className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center hover:bg-green-600 hover:text-white transition">
                                    +
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
