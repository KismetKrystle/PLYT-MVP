'use client';

import React, { useState, useEffect } from 'react';
import api from '../../lib/api';

interface WalletData {
    plyt: {
        spendable: string;
        staked: string;
    };
    backing: {
        xrp: string;
    };
    apy: string;
}

export default function WalletPage() {
    const [wallet, setWallet] = useState<WalletData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWallet();
    }, []);

    const fetchWallet = async () => {
        try {
            const res = await api.get('/wallet');
            console.log('Wallet Data:', res.data); // Debug
            setWallet(res.data);
        } catch (error) {
            console.error('Failed to fetch wallet', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTopUp = async () => {
        try {
            const res = await api.post('/wallet/topup', {});
            alert(`Simulation: ${res.data.message}`);
        } catch (error) {
            console.error('Top up failed', error);
        }
    };

    const handleStake = async () => {
        const amount = prompt('Enter amount to stake:');
        if (!amount) return;
        try {
            await api.post('/wallet/stake', { amount: parseFloat(amount) });
            fetchWallet(); // Refresh
        } catch (error) {
            console.error('Stake failed', error);
            alert('Stake failed');
        }
    };

    const handleWithdraw = async () => {
        const amount = prompt('Enter amount to withdraw:');
        if (!amount) return;
        try {
            await api.post('/wallet/withdraw', { amount: parseFloat(amount), method: 'bank' });
            alert('Withdrawal initiated');
        } catch (error) {
            console.error('Withdraw failed', error);
            alert('Withdraw failed');
        }
    };

    if (loading) return <div className="p-8">Loading wallet...</div>;
    if (!wallet) return <div className="p-8">Wallet not found. Please log in.</div>;

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Wallet</h1>

            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                    <p className="text-indigo-100 text-sm font-medium mb-1">Total Balance</p>
                    <h2 className="text-4xl font-bold mb-4">{Number(wallet?.plyt?.spendable || 0).toFixed(2)} PLYT</h2>
                    <div className="flex gap-3">
                        <button onClick={handleTopUp} className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-medium transition">
                            Top Up
                        </button>
                        <button onClick={handleWithdraw} className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-medium transition">
                            Withdraw
                        </button>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <p className="text-gray-500 text-sm font-medium mb-1">Staking Rewards</p>
                    <h2 className="text-4xl font-bold text-gray-900 mb-2">{wallet?.apy || '0%'} <span className="text-lg font-normal text-gray-400">APY</span></h2>
                    <p className="text-gray-600 text-sm mb-4">Staked: {Number(wallet?.plyt?.staked || 0).toFixed(2)} PLYT</p>
                    <button onClick={handleStake} className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 py-2 rounded-lg text-sm font-medium transition">
                        Manage Staking
                    </button>
                </div>
            </div>

            {/* Transactions */}
            <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-8 text-center text-gray-500">
                    No recent transactions.
                </div>
            </div>
        </div>
    );
}
