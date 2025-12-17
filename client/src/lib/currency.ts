export type Currency = 'USD' | 'IDR';

// Approximate exchange rate: 1 USD = 15,850 IDR
export const EXCHANGE_RATE_USD_IDR = 15850;

/**
 * Formats a USD amount into the target currency string.
 * @param amountInUsd The amount in USD to convert/format.
 * @param targetCurrency The currency to display ('USD' or 'IDR').
 * @returns Formatted string (e.g., "$12.50" or "Rp 198.125")
 */
export function formatCurrency(amountInUsd: number, targetCurrency: Currency): string {
    if (targetCurrency === 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amountInUsd);
    } else {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0
        }).format(amountInUsd * EXCHANGE_RATE_USD_IDR);
    }
}
