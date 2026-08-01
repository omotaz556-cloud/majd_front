import client from './client';

// ====== نظام المكافأة اليومية (Daily Reward) - نداءات HTTP خام بس لـ
// /api/daily-reward على الباك إند (راجع backend/src/modules/dailyReward/).
// مفيش أي حساب ستريك أو مكافأة هنا - كله مسؤولية السيرفر. ======

export async function getDailyRewardStatus() {
  const { data } = await client.get('/daily-reward/status');
  return data; // { eligible, seconds_remaining, current_streak, next_streak, last_claim_date, preview_reward }
}

export async function claimDailyReward() {
  const { data } = await client.post('/daily-reward/claim');
  return data; // { current_streak, last_claim_date, granted }
}
