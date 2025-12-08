export default function EatPage() {
    return (
        <div className="flex h-[calc(100vh-4rem)]">
            {/* Left Interface: Chat */}
            <div className="flex-1 border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                    <h2 className="font-semibold text-gray-800">PLYT Assistant (Eat Mode)</h2>
                </div>
                <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
                    {/* Chat Messages Placeholder */}
                    <div className="bg-white p-3 rounded-lg shadow-sm max-w-[80%] mb-4">
                        <p className="text-gray-800">Hello! What would you like to cook today?</p>
                    </div>
                </div>
                <div className="p-4 border-t border-gray-200 bg-white">
                    {/* Chat Input */}
                    <input
                        type="text"
                        placeholder="Type a message..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                </div>
            </div>

            {/* Right Interface: Basket / Results */}
            <div className="w-96 flex flex-col bg-white">
                <div className="p-4 border-b border-gray-200 bg-green-50">
                    <h2 className="font-semibold text-green-800">Your Basket</h2>
                </div>
                <div className="flex-1 p-4">
                    <p className="text-gray-500 text-center mt-10">Your basket is empty.</p>
                </div>
                <div className="p-4 border-t border-gray-200">
                    <button className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition">
                        Proceed to Checkout
                    </button>
                </div>
            </div>
        </div>
    );
}
