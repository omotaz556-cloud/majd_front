import client from './client';

// بيرجع الباقات النشطة بس (نفس الباقات اللي الأدمن ضايفها من لوحة التحكم)
// عشان تتعرض في صفحة شحن الرصيد - عام، من غير تسجيل دخول
export async function listActiveCoinPackages() {
  const { data } = await client.get('/coin-packages');
  return data.packages;
}

// بيبدأ عملية إيداع جديدة، بيرجع كل حاجة محتاجينها لبناء فورم Moyasar.js
// (publishable key, amount بالهللة, given_id, callback_url...)
export async function initiateDeposit(amount, packageId = null) {
  const { data } = await client.post('/wallet/deposit/initiate', {
    amount,
    package_id: packageId,
  });
  return data; // { payment_config: {...} }
}

// بيستعلم عن حالة عملية إيداع بعد ما اللاعب يرجع من صفحة الدفع
export async function getDepositStatus(paymentId) {
  const { data } = await client.get(`/wallet/deposit/${paymentId}/status`);
  return data; // { status, amount, currency, failure_reason }
}

// متاحة بس لما الباك إند شغال بـ PAYMENT_PROVIDER=mock (وضع التطوير)
// بتأكد الإيداع مباشرة من غير Moyasar - راجع payment.service.js
export async function mockCompleteDeposit(paymentId, { success = true } = {}) {
  const { data } = await client.post(`/wallet/deposit/${paymentId}/mock-complete`, { success });
  return data; // { processed, status, transaction_id }
}
