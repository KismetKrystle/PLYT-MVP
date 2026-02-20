import dotenv from 'dotenv';
dotenv.config();

import express, { Express, Request, Response } from 'express';
import cors from 'cors';

import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import sessionRoutes from './routes/session';
import assistantRoutes from './routes/assistant';
import inventoryRoutes from './routes/inventory';
import growRoutes from './routes/grow';
import orderRoutes from './routes/orders';
import walletRoutes from './routes/wallet';
import chatRoutes from './routes/chat';
import { softAuthenticateToken } from './middleware/softAuth';
import { checkGatekeeper } from './middleware/gatekeeper';

const app: Express = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Global Middleware (Order matters!)
app.use(softAuthenticateToken);
app.use(checkGatekeeper);


app.use('/auth', authRoutes);
app.use('/', userRoutes); // mounts /me
app.use('/session', sessionRoutes);
app.use('/assistant', assistantRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/grow', growRoutes);
app.use('/order', orderRoutes);
app.use('/wallet', walletRoutes);
app.use('/chat', chatRoutes);

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

app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});

// Force restart trigger
