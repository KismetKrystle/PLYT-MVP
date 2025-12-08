import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import sessionRoutes from './routes/session';
import assistantRoutes from './routes/assistant';
import inventoryRoutes from './routes/inventory';
import growRoutes from './routes/grow';
import orderRoutes from './routes/orders';
import walletRoutes from './routes/wallet';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/', userRoutes); // mounts /me
app.use('/session', sessionRoutes);
app.use('/assistant', assistantRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/grow', growRoutes);
app.use('/orders', orderRoutes);
app.use('/wallet', walletRoutes);

app.get('/', (req: Request, res: Response) => {
    res.send('PLYT MVP Backend is running');
});

app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});
