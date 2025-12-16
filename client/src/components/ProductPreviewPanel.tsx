'use client';

import Image from 'next/image';

// Simple mock for preview items. 
// In real app, this would be fueled by the "selected" context from the chat.
const MOCK_ITEMS = {
    system: {
        name: 'Hydro-Kit V3',
        price: 'Rp 1,200,000',
        plyt: '1,200 PLYT',
        image: '/images/mock-system.jpg', // We'll handle missing images gracefully
        description: 'Automated hydroponic system for small apartments. Includes 20 pots, pump, and timer.',
        specs: ['20 Plant Sites', 'LED Lights Included', 'Low Power Pump'],
    },
    produce: {
        name: 'Organic Kale Bundle',
        price: 'Rp 45,000/kg',
        plyt: '45 PLYT',
        image: '/images/mock-produce.jpg',
        description: 'Freshly harvested curly kale from Ubud organic farm.',
        specs: ['Pesticide Free', 'Harvested Today', 'Ubud Region'],
    }
};

interface ProductPreviewPanelProps {
    type?: 'system' | 'produce' | null;
}

export default function ProductPreviewPanel({ type = 'system' }: ProductPreviewPanelProps) {
    if (!type) {
        return (
            <div className="w-80 border-l border-gray-200 bg-white p-6 hidden xl:flex flex-col items-center justify-center text-center text-gray-400">
                <svg className="w-12 h-12 mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                <p>Select an item in chat to view details</p>
            </div>
        );
    }

    const item = type === 'system' ? MOCK_ITEMS.system : MOCK_ITEMS.produce;

    return (
        <div className="w-80 border-l border-gray-200 bg-white flex flex-col h-full shrink-0">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">Preview</h3>
                <button className="text-gray-400 hover:text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Image Placeholder */}
                <div className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="text-gray-400 text-sm">Image Preview</span>
                </div>

                {/* Title & Price */}
                <div>
                    <div className="flex justify-between items-start mb-1">
                        <h2 className="text-xl font-bold text-gray-900 leading-tight">{item.name}</h2>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold text-green-600">{item.price}</span>
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{item.plyt}</span>
                    </div>
                </div>

                {/* Specs/Features */}
                <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Key Features</h4>
                    <ul className="space-y-2">
                        {item.specs.map(spec => (
                            <li key={spec} className="flex items-center text-sm text-gray-600">
                                <svg className="w-4 h-4 text-green-500 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                {spec}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Description */}
                <div>
                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">Description</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        {item.description}
                    </p>
                </div>
            </div>

            {/* Action Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50">
                <button className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold shadow-md shadow-green-600/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                    Add to Order
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </button>
            </div>
        </div>
    );
}
