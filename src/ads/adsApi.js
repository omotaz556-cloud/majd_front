import client from '../api/client';

/**
 * ====== Ads API ======
 * كل نداءات الباك إند الخاصة بالإعلانات معزولة هنا - أي حاجة تانية في
 * التطبيق (games, pages) ماينفعش تنادي على الـ endpoints دي مباشرة، لازم
 * تعدّي عن طريق AdsManager بس.
 */

export async function startRewardSession({ adUnit, kind, context } = {}) {
  const { data } = await client.post('/ads/reward/start', { adUnit, kind, context });
  return data; // { sessionId, signedToken, kind, payload, reward, expiresAt }
}

export async function completeRewardSession({ sessionId, signedToken, providerPayload }) {
  const { data } = await client.post('/ads/reward/complete', {
    sessionId,
    signedToken,
    providerPayload,
  });
  return data; // { processed, sessionId, reward } | { alreadyProcessed, sessionId, reward }
}

// ====== حالة هدية الساعة - أهلية + عدّاد تنازلي (ثواني) لآخر مرة استلمها
// اللاعب - عشان HourlyGiftPopup يقدر يعرض عدّاد حي من غير ما يحاول /start. ======
export async function getHourlyGiftStatus() {
  const { data } = await client.get('/ads/hourly-gift/status');
  return data; // { eligible, secondsRemaining, cooldownHours }
}
