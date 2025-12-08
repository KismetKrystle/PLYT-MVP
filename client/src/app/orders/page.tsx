export default function OrdersPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Orders</h1>

            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total (PLYT)</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {/* Mock Rows */}
                        <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#ORD-101</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Eat</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Oct 24, 2024</td>
                            <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Paid</span></td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">45.50</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
