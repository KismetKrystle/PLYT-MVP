export default function WalletPage() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Wallet</h1>

            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                    <p className="text-indigo-100 text-sm font-medium mb-1">Total Balance</p>
                    <h2 className="text-4xl font-bold mb-4">1,250.00 PLYT</h2>
                    <div className="flex gap-3">
                        <button className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-medium transition">
                            Top Up
                        </button>
                        <button className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-medium transition">
                            Withdraw
                        </button>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <p className="text-gray-500 text-sm font-medium mb-1">Staking Rewards</p>
                    <h2 className="text-4xl font-bold text-gray-900 mb-2">12.5% <span className="text-lg font-normal text-gray-400">APY</span></h2>
                    <p className="text-gray-600 text-sm mb-4">Earn more by locking your unused PLYT.</p>
                    <button className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 py-2 rounded-lg text-sm font-medium transition">
                        Manage Staking
                    </button>
                </div>
            </div>

            {/* Transactions */}
            <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center hover:bg-gray-50">
                    <div>
                        <p className="font-medium text-gray-900">Eat Order #101</p>
                        <p className="text-xs text-gray-500">Oct 24, 2024</p>
                    </div>
                    <span className="text-red-600 font-medium">- 45.50 PLYT</span>
                </div>
                <div className="p-4 border-b border-gray-100 flex justify-between items-center hover:bg-gray-50">
                    <div>
                        <p className="font-medium text-gray-900">Deposit (Fiat On-Ramp)</p>
                        <p className="text-xs text-gray-500">Oct 20, 2024</p>
                    </div>
                    <span className="text-green-600 font-medium">+ 500.00 PLYT</span>
                </div>
            </div>
        </div>
    );
}
