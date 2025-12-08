import express, { Response } from 'express';
import pool from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getAccountBalance } from '../services/xrplService';

const router = express.Router();

// Get Wallet Overview
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;

        // Get Internal Ledger Balance
        const userResult = await pool.query('SELECT plyt_balance, staked_balance, wallet_address FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            res.sendStatus(404);
            return;
        }
        const user = userResult.rows[0];

        // Get XRPL Balance (Backing assets - optional view)
        let xrplBalance = '0';
        if (user.wallet_address) {
            const balance = await getAccountBalance(user.wallet_address);
            xrplBalance = String(balance);
        }

        res.json({
            plyt: {
                spendable: user.plyt_balance,
                staked: user.staked_balance,
            },
            backing: {
                xrp: xrplBalance
            },
            apy: '12.5%' // Mock APY
        });

    } catch (error) {
        console.error('Get wallet error:', error);
        res.sendStatus(500);
    }
});

// Top Up (Stub)
router.post('/topup', authenticateToken, async (req: AuthRequest, res: Response) => {
    // In real app: Call Stripe/MoonPay/On-Ramp provider
    res.json({
        url: 'https://mock-onramp.com/pay',
        message: 'Redirect user to this URL to buy PLYT'
    });
});

// Withdraw (Stub)
router.post('/withdraw', authenticateToken, async (req: AuthRequest, res: Response) => {
    const { amount, method } = req.body;
    // In real app: Check KYC, burn PLYT, send fiat via Off-Ramp
    res.json({
        success: true,
        message: `Withdrawal of ${amount} PLYT via ${method} initiated.`
    });
});

// Stake
router.post('/stake', authenticateToken, async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const userId = req.user?.id;
        const { amount } = req.body;

        await client.query(
            'UPDATE users SET plyt_balance = plyt_balance - $1, staked_balance = staked_balance + $1 WHERE id = $2',
            [amount, userId]
        );

        await client.query(
            'INSERT INTO transactions (user_id, type, amount) VALUES ($1, $2, $3)',
            [userId, 'stake', amount]
        );

        await client.query('COMMIT');
        res.json({ success: true, message: `Staked ${amount} PLYT` });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Stake error:', error);
        res.status(500).json({ error: 'Staking failed' });
    } finally {
        client.release();
    }
});

// Unstake
router.post('/unstake', authenticateToken, async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const userId = req.user?.id;
        const { amount } = req.body;

        await client.query(
            'UPDATE users SET plyt_balance = plyt_balance + $1, staked_balance = staked_balance - $1 WHERE id = $2',
            [amount, userId]
        );

        await client.query(
            'INSERT INTO transactions (user_id, type, amount) VALUES ($1, $2, $3)',
            [userId, 'unstake', amount]
        );

        await client.query('COMMIT');
        res.json({ success: true, message: `Unstaked ${amount} PLYT` });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Unstake error:', error);
        res.status(500).json({ error: 'Unstaking failed' });
    } finally {
        client.release();
    }
});

export default router;
