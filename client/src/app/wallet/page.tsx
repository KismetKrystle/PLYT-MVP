'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { formatCurrency, Currency } from '../../lib/currency';
import { useAuth } from '../../lib/auth';

// -- Mock Data --
const MOCK_TRANSACTIONS = [
    { id: 1, type: 'Deposit', amount: 1250, date: '2024-10-24', status: 'Completed', method: 'BCA Virtual Account' },
    { id: 2, type: 'Purchase', amount: -45, date: '2024-10-23', status: 'Completed', description: 'Fresh Kale x3' },
    { id: 3, type: 'Withdrawal', amount: -500, date: '2024-10-22', status: 'Pending', method: 'GoPay' },
];

const CONNECTED_ACCOUNTS = [
    { id: 1, type: 'Bank', name: 'BCA', number: '**** 8899', connected: true },
    { id: 2, type: 'E-Wallet', name: 'GoPay', number: '0812-****-9988', connected: true },
    { id: 3, type: 'E-Wallet', name: 'OVO', number: '', connected: false },
];

// -- Mock NFTs --
const MOCK_NFTS = [
    { id: 'nft-001', name: 'VertiGrow Tower V2 #8839', type: 'System Identity', image: '/assets/images/systems/tower.jpg', hash: '0x71C...9A23', status: 'Active' },
    { id: 'nft-002', name: 'Hydro Starter Kit #102', type: 'System Identity', image: '/assets/images/gallery/hydro_system.png', hash: '0x82B...1B44', status: 'Inactive' }
];

export default function WalletPage() {
    const { user } = useAuth();
    const [currency, setCurrency] = useState<Currency>('IDR');
    const [activeTab, setActiveTab] = useState<'overview' | 'methods' | 'history' | 'assets'>('overview');
    const [showTopUpModal, setShowTopUpModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<any>(null);

    // Mock Balances
    const balancePLYT = 1250;
    const balanceUSD = 12.50;

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Wallet</h1>
                    <p className="text-gray-500">Manage your funds, payments, connected accounts, and digital assets.</p>
                </div>
                {/* Currency Toggler */}
                <div className="bg-white p-1 rounded-xl border border-gray-200 shadow-sm flex self-start">
                    {(['IDR', 'USD'] as Currency[]).map((c) => (
                        <button
                            key={c}
                            onClick={() => setCurrency(c)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition ${currency === c ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            {c}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Col: Balance Card */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>

                        <div className="relative z-10">
                            <p className="text-gray-400 text-sm uppercase tracking-wider font-semibold mb-2">Total Balance</p>
                            <h2 className="text-5xl font-bold mb-2">
                                {currency === 'IDR' ? formatCurrency(balanceUSD, 'IDR') : formatCurrency(balanceUSD, 'USD')}
                            </h2>
                            <p className="text-green-400 font-medium mb-8">
                                ≈ {balancePLYT.toLocaleString()} PLYT
                            </p>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowTopUpModal(true)}
                                    className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 px-6 rounded-xl font-bold shadow-lg shadow-green-900/20 transition transform active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                    Top Up
                                </button>
                                <button className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 px-6 rounded-xl font-bold backdrop-blur-md transition transform active:scale-95 flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                                    Withdraw
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Tabs Navigation */}
                    <div className="flex border-b border-gray-200 overflow-x-auto no-scrollbar">
                        {(['overview', 'assets', 'methods', 'history'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-3 text-sm font-semibold capitalize border-b-2 transition-colors whitespace-nowrap ${activeTab === tab ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                            >
                                {tab === 'methods' ? 'Payment Methods' : tab === 'assets' ? 'Digital Assets' : tab}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="min-h-[300px]">
                        {activeTab === 'overview' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <h3 className="font-bold text-gray-900 text-lg">Quick Actions</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <button className="p-4 rounded-xl border border-gray-100 bg-white hover:border-green-200 hover:shadow-md transition text-left group">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                        </div>
                                        <span className="font-bold text-gray-800 block">Transfer</span>
                                        <span className="text-xs text-gray-500">To other users</span>
                                    </button>
                                    <button className="p-4 rounded-xl border border-gray-100 bg-white hover:border-green-200 hover:shadow-md transition text-left group">
                                        <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                        </div>
                                        <span className="font-bold text-gray-800 block">Pay Bills</span>
                                        <span className="text-xs text-gray-500">Utilities & more</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'assets' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                {MOCK_NFTS.map(nft => (
                                    <div key={nft.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm gap-4 transition hover:shadow-md">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-lg bg-gray-100 relative overflow-hidden shrink-0">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={nft.image} alt={nft.name} className="object-cover w-full h-full" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900">{nft.name}</h4>
                                                <p className="text-xs text-gray-500 mb-1">{nft.type}</p>
                                                <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-mono rounded">
                                                    {nft.hash}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button className="flex-1 sm:flex-none px-4 py-2 text-sm font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition">
                                                View
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedAsset(nft);
                                                    setShowTransferModal(true);
                                                }}
                                                className="flex-1 sm:flex-none px-4 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg transition shadow-sm"
                                            >
                                                Transfer / Sell
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {MOCK_NFTS.length === 0 && (
                                    <div className="text-center py-12 text-gray-400">
                                        <p>No digital assets found.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'methods' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                {CONNECTED_ACCOUNTS.map(acc => (
                                    <div key={acc.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-white ${acc.connected ? 'bg-blue-600' : 'bg-gray-300'}`}>
                                                {acc.name[0]}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900">{acc.name}</h4>
                                                <p className="text-sm text-gray-500">{acc.type} {acc.connected ? `• ${acc.number}` : '• Not Connected'}</p>
                                            </div>
                                        </div>
                                        <button className={`px-4 py-2 text-sm font-bold rounded-lg transition ${acc.connected ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                                            {acc.connected ? 'Disconnect' : 'Connect'}
                                        </button>
                                    </div>
                                ))}
                                <button className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 font-bold hover:border-green-400 hover:text-green-600 transition flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    Add New Method
                                </button>
                            </div>
                        )}

                        {activeTab === 'history' && (
                            <div className="space-y-0 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                {MOCK_TRANSACTIONS.map((tx, idx) => (
                                    <div key={tx.id} className={`flex items-center justify-between p-4 ${idx !== MOCK_TRANSACTIONS.length - 1 ? 'border-b border-gray-100' : ''}`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.amount > 0 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    {tx.amount > 0
                                                        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                                        : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                                    }
                                                </svg>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900">{tx.type}</h4>
                                                <p className="text-xs text-gray-500">{tx.date} • {tx.status}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`block font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                                                {tx.amount > 0 ? '+' : ''}{currency === 'IDR' ? formatCurrency(Math.abs(tx.amount) * 0.01, 'IDR') : formatCurrency(Math.abs(tx.amount) * 0.01, 'USD')}
                                            </span>
                                            <span className="text-xs text-gray-400">{Math.abs(tx.amount)} PLYT</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Col: Stats & Info */}
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-4">Account Limits</h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-500">Daily Withdrawal</span>
                                    <span className="font-bold text-gray-900">14%</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2">
                                    <div className="bg-green-500 h-2 rounded-full w-[14%]"></div>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">Used Rp 1.4M of Rp 10M limit</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 rounded-3xl p-6 border border-blue-100">
                        <h3 className="font-bold text-blue-900 mb-2">Need Help?</h3>
                        <p className="text-sm text-blue-700 mb-4">Having trouble with your wallet? Our support team is here to assist you.</p>
                        <button className="w-full py-2 bg-white text-blue-600 font-bold rounded-lg shadow-sm hover:bg-blue-50 transition">
                            Contact Support
                        </button>
                    </div>
                </div>
            </div>

            {/* Top Up Modal */}
            {showTopUpModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative"
                    >
                        <button onClick={() => setShowTopUpModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>

                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Top Up Wallet</h2>
                        <p className="text-gray-500 text-sm mb-6">Select a method to add funds to your wallet.</p>

                        <div className="space-y-3">
                            {['Bank Transfer (Virtual Account)', 'Credit Card', 'E-Wallet (GoPay/OVO)'].map(method => (
                                <button key={method} className="w-full p-4 rounded-xl border border-gray-200 hover:border-green-500 hover:bg-green-50 transition text-left flex items-center justify-between group">
                                    <span className="font-semibold text-gray-700 group-hover:text-green-700">{method}</span>
                                    <svg className="w-5 h-5 text-gray-300 group-hover:text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Transfer Asset Modal */}
            {showTransferModal && selectedAsset && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative"
                    >
                        <button onClick={() => setShowTransferModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>

                        <h2 className="text-xl font-bold text-gray-900 mb-1">Transfer Ownership</h2>
                        <h3 className="text-green-600 font-bold mb-4">{selectedAsset.name}</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Recipient Wallet Address</label>
                                <input
                                    type="text"
                                    placeholder="0x..."
                                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none text-sm font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Sale Price (Optional)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-3 text-gray-400 text-sm">PLYT</span>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        className="w-full p-3 pl-12 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex gap-3">
                            <button onClick={() => setShowTransferModal(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition">
                                Cancel
                            </button>
                            <button onClick={() => setShowTransferModal(false)} className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-200 transition">
                                Confirm Transfer
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
