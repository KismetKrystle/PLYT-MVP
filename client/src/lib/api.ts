import axios from 'axios';

const api = axios.create({
    baseURL: (process.env.NEXT_PUBLIC_API_URL as string) || 'http://localhost:4000',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to include the auth token
api.interceptors.request.use((config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});


// Mock Data Store for Demo Mode
const MOCK_DATA: Record<string, any> = {
    '/inventory/search': [
        { id: 1, name: 'Organic Bali Spinach', price_plyt: 15, price_fiat: 225000, farmer_name: 'WayanOrganic', distance_km: 3.5, image_url: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&q=80' },
        { id: 2, name: 'Red Hydro Carrots', price_plyt: 10, price_fiat: 150000, farmer_name: 'BaliHydro', distance_km: 1.2, image_url: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&q=80' },
        { id: 3, name: 'Fresh Bok Choy', price_plyt: 8, price_fiat: 120000, farmer_name: 'GreenLife', distance_km: 5.0, image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80' }
    ],
    '/grow/systems/search': [
        { id: 1, name: 'Vertical Hydro Tower', type: 'Hydroponic', difficulty: 'Beginner', price_plyt: 500, image_url: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&q=80' },
        { id: 2, name: 'Backyard NFT System', type: 'NFT', difficulty: 'Intermediate', price_plyt: 1200, image_url: 'https://images.unsplash.com/photo-1556955112-28cde3817b0a?auto=format&fit=crop&q=80' }
    ],
    '/wallet': {
        balance: 1500,
        transactions: [
            { id: 1, type: 'credit', amount: 500, description: 'Initial Deposit', date: new Date().toISOString() },
            { id: 2, type: 'debit', amount: 15, description: 'Purchase: Spinach', date: new Date().toISOString() }
        ]
    }
};

api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Safe check for config existence to prevent crashes
        const config = error.config || {};
        const url = config.url ? config.url.split('?')[0] : '';

        console.warn('API Error Intercepted:', url, error.message);

        // Find matching mock data
        const mockResponse = Object.keys(MOCK_DATA).find(key => url.endsWith(key));

        if (mockResponse) {
            console.warn(`Falling back to MOCK DATA for ${url}`);
            return Promise.resolve({
                data: MOCK_DATA[mockResponse],
                status: 200,
                statusText: 'OK (Mock)',
                headers: {},
                config: config
            });
        }

        // If no mock data found, reject safely
        return Promise.reject(error);
    }
);

export default api;
