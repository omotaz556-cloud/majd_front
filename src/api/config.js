import client from './client';

// بيرجع اسم المزوّدين الفعّالين على الباك إند (payment_provider, ads_provider)
// من غير أي مفاتيح سرية - endpoint عام مش محتاج توكن
export async function getAppConfig() {
  const { data } = await client.get('/config');
  return data; // { payment_provider, ads_provider }
}
