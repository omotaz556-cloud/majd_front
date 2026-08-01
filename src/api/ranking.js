import client from './client';

// ====== تصنيف VIP (in-game) - نداء واحد بيكلم /api/ranking/vip الموجود في
// الباك إند (ranking.controller.js). من غير query: بيرجّع أفضل 100 لاعب +
// مركز اللاعب الحالي. بـ query (q): بيرجّع نتايج بحث بالاسم من التصنيف كامله
// (مش مقصورة على أفضل 100). ======

export async function getVipRanking() {
  const { data } = await client.get('/ranking/vip');
  return data;
}

export async function searchVipRanking(query) {
  const { data } = await client.get('/ranking/vip', { params: { q: query } });
  return data;
}
