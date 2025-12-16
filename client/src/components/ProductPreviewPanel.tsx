'use client';

import Image from 'next/image';

export interface ProductDetail {
    id: string;
    name: string;
    price: number;
    unit: string;
    plyt: string;
    image: string;
    description: string;
    specs: string[];
    farm: string; // Used for "Created By" if artisan not present
    growMethod?: string;
    artisan?: string;
    material?: string;
    impactScore?: number;
}

interface ProductPreviewPanelProps {
    item: ProductDetail | null;
    onClose: () => void;
}

export default function ProductPreviewPanel({ item, onClose }: ProductPreviewPanelProps) {
    if (!item) return null;

    return (
        <div className="w-full h-full bg-white flex flex-col relative">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                <h3 className="font-semibold text-gray-800">Product Details</h3>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Image Placeholder */}
                <div className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center relative overflow-hidden group">
                    {/* In a real app, use Image component with item.image */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>

                {/* Title & Price */}
                <div>
                    <div className="flex justify-between items-start mb-1">
                        <h2 className="text-xl font-bold text-gray-900 leading-tight">{item.name}</h2>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold text-green-600">Rp {item.price.toLocaleString()}</span>
                        <span className="text-sm text-gray-500">/ {item.unit}</span>
                    </div>
                </div>

                {/* Creator / Artisan Info */}
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                    <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-bold">
                        {(item.artisan || item.farm).charAt(0)}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-800">{item.artisan || item.farm}</p>
                        <p className="text-xs text-gray-500">{item.artisan ? 'Artisan Creator' : item.growMethod}</p>
                    </div>
                </div>

                {/* Impact Score (if present) */}
                {item.impactScore && (
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between">
                        <span className="text-sm font-semibold text-blue-900">Impact Score</span>
                        <span className="text-lg font-bold text-blue-600">{item.impactScore}/1000</span>
                    </div>
                )}

                {/* Specs/Features */}
                <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Details</h4>
                    <ul className="space-y-2">
                        {item.material && (
                            <li className="flex items-center text-sm text-gray-600">
                                <span className="font-semibold mr-2 text-gray-900">Material:</span> {item.material}
                            </li>
                        )}
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
            <div className="p-4 border-t border-gray-100 bg-gray-50 sticky bottom-0">
                <button className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold shadow-md shadow-green-600/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                    Add Another to Order
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </button>
            </div>
        </div>
    );
}
