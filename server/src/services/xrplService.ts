import xrpl from 'xrpl';
import dotenv from 'dotenv';

dotenv.config();

// XRPL Testnet Server
const XRPL_SERVER = process.env.XRPL_SERVER || 'wss://s.altnet.rippletest.net:51233';

let client: xrpl.Client;

// Initialize connection to XRPL
export const initConnection = async () => {
    if (!client) {
        client = new xrpl.Client(XRPL_SERVER);
    }
    if (!client.isConnected()) {
        await client.connect();
        console.log(`[xrpl] Connected to ${XRPL_SERVER}`);
    }
    return client;
};

// Get Treasury Wallet (from Env)
// In production, use a secure vault or HSM.
export const getTreasuryWallet = () => {
    const seed = process.env.XRPL_SEED;
    if (!seed) {
        console.warn('[xrpl] No XRPL_SEED in env. Using random wallet for dev/test only.');
        return xrpl.Wallet.generate();
    }
    return xrpl.Wallet.fromSeed(seed);
};

// Get Balances (XRP + Drops)
export const getAccountBalance = async (address: string) => {
    await initConnection();
    try {
        const balance = await client.getXrpBalance(address);
        return balance;
    } catch (error) {
        console.error(`[xrpl] Error fetching balance for ${address}:`, error);
        return '0';
    }
};

// Send Payment (XRP)
export const sendPayment = async (amountXrp: string, destinationAddress: string) => {
    await initConnection();
    const wallet = getTreasuryWallet();

    console.log(`[xrpl] Sending ${amountXrp} XRP from ${wallet.address} to ${destinationAddress}`);

    const prepared = await client.autofill({
        TransactionType: 'Payment',
        Account: wallet.address,
        Amount: xrpl.xrpToDrops(amountXrp),
        Destination: destinationAddress,
    });

    const signed = wallet.sign(prepared);
    const tx = await client.submitAndWait(signed.tx_blob);

    // Helper to safely access TransactionResult
    const getResult = (meta: any) => {
        if (typeof meta === 'string') return null;
        return meta?.TransactionResult;
    };

    const result = getResult(tx.result.meta);
    console.log('[xrpl] Transaction result:', result);

    if (result === 'tesSUCCESS') {
        return {
            success: true,
            hash: tx.result.hash,
            fee: (tx.result as any).Fee
        };
    } else {
        throw new Error(`Transaction failed: ${result}`);
    }
};

// Monitor for incoming payments (Simple Stub)
export const watchIncomingPayments = async (address: string, onPayment: (tx: any) => void) => {
    await initConnection();
    console.log(`[xrpl] Watching for payments to ${address}...`);

    client.request({
        command: 'subscribe',
        accounts: [address]
    });

    client.on('transaction', (tx: any) => {
        // Safe access to transaction fields
        const transaction = tx.transaction || tx;

        if (transaction && transaction.TransactionType === 'Payment' && transaction.Destination === address) {
            const result = typeof tx.meta === 'string' ? null : tx.meta?.TransactionResult;

            if (result === 'tesSUCCESS') {
                console.log('[xrpl] Payment received!', tx);
                onPayment(tx);
            }
        }
    });
};
