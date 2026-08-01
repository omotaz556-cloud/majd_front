import client from './client';
import { toNumber } from '../utils/money';

export async function getMyWallet() {
  const { data } = await client.get('/wallet/me');
  return { ...data.wallet, balance: toNumber(data.wallet.balance) };
}

export async function getMyTransactions({ limit = 50, skip = 0 } = {}) {
  const { data } = await client.get('/wallet/me/transactions', {
    params: { limit, skip },
  });
  return data.transactions.map((tx) => ({
    ...tx,
    gross_amount: toNumber(tx.gross_amount),
    vat_amount: toNumber(tx.vat_amount),
    net_amount: toNumber(tx.net_amount),
    coin_amount: toNumber(tx.coin_amount),
  }));
}
