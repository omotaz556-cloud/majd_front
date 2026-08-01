import client from './client';

// ====== نظام "المهام اليومية" (in-game) - بيكلم /api/quests. القائمة
// بتتولد تلقائيًا في الباك إند لو مفيش مهام لليوم الحالي، فمفيش حاجة تتبعت
// من هنا غير طلب القائمة، وطلب استلام مكافأة مهمة خلصت. ======

export async function getMyQuests() {
  const { data } = await client.get('/quests');
  return data;
}

export async function claimQuestReward(questId) {
  const { data } = await client.post(`/quests/${questId}/claim`);
  return data;
}
