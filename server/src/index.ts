import dotenv from 'dotenv';
dotenv.config();

import express, { Express, Request, Response } from 'express';
import cors from 'cors';

import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import usersRoutes from './routes/users';
import sessionRoutes from './routes/session';
import assistantRoutes from './routes/assistant';
import inventoryRoutes from './routes/inventory';
import growRoutes from './routes/grow';
import orderRoutes from './routes/orders';
import walletRoutes from './routes/wallet';
import chatRoutes from './routes/chat';
import placeProfileRoutes from './routes/place-profiles';
import digitalAssetRoutes from './routes/digital-assets';
import profileLibraryRoutes from './routes/profile-library';
import consumerHealthProfileRoutes from './routes/consumer-health-profile';
import farmerProfileRoutes from './routes/farmer-profiles';
import expertProfileRoutes from './routes/expert-profiles';
import messagesToAdminRoutes from './routes/messages-to-admin';
import { softAuthenticateToken } from './middleware/softAuth';
import { checkGatekeeper } from './middleware/gatekeeper';

const app: Express = express();
const port = process.env.PORT || 4000;
const host = '0.0.0.0';

const allowedOrigins = new Set([
    'http://localhost:3000',
    'https://app.plyant.com',
    'https://www.app.plyant.com'
]);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '25mb' }));

// Global Middleware (Order matters!)
app.use(softAuthenticateToken);
app.use(checkGatekeeper);


app.use('/auth', authRoutes);
app.use('/', userRoutes); // keeps /me
app.use('/user', userRoutes); // keeps /user/profile compatibility
app.use('/users', usersRoutes);
app.use('/consumer-health-profile', consumerHealthProfileRoutes);
app.use('/farmer-profiles', farmerProfileRoutes);
app.use('/expert-profiles', expertProfileRoutes);
app.use('/session', sessionRoutes);
app.use('/assistant', assistantRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/grow', growRoutes);
app.use('/order', orderRoutes);
app.use('/wallet', walletRoutes);
app.use('/digital-assets', digitalAssetRoutes);
app.use('/profile-library', profileLibraryRoutes);
app.use('/messages-to-admin', messagesToAdminRoutes);
app.use('/chat', chatRoutes);
app.use('/place-profiles', placeProfileRoutes);

app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'ok',
        env: {
            JWT_SECRET: !!process.env.JWT_SECRET,
            GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
            DATABASE_URL: !!process.env.DATABASE_URL,
            ACCESS_WALL_ENABLED: process.env.ACCESS_WALL_ENABLED === 'true'
        },
        time: new Date().toISOString()
    });
});

app.get('/', (req: Request, res: Response) => {
    res.send('PLYT MVP Backend is running');
});

app.listen(Number(port), host, () => {
    console.log(`[server]: Server is running at http://${host}:${port}`);
});

// Force restart trigger
