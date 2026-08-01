import client from './client';

// ====== الشات العام - كل اللاعبين تشوفه ======
export async function getGlobalMessages() {
  const { data } = await client.get('/chat/global');
  return data;
}

export async function sendGlobalMessage(body) {
  const { data } = await client.post('/chat/global', { body });
  return data;
}

// ====== الشات الخاص - بين لاعبين محددين بس ======
export async function getConversations() {
  const { data } = await client.get('/chat/conversations');
  return data;
}

export async function getPrivateMessages(userId) {
  const { data } = await client.get(`/chat/private/${userId}`);
  return data;
}

export async function sendPrivateMessage(userId, body) {
  const { data } = await client.post(`/chat/private/${userId}`, { body });
  return data;
}

// ====== بحث عن لاعبين (بالاسم أو رقم اللاعب) لبدء شات خاص جديد ======
export async function searchUsers(query) {
  const { data } = await client.get('/users/search', { params: { q: query } });
  return data;
}

// ====== قائمة معرّفات اللاعبين المتصلين (أونلاين) حاليًا - fallback بجانب
// أحداث السوكيت (chat:online_snapshot / chat:user_online / chat:user_offline)
// لو الصفحة اتفتحت والسوكيت لسه بيتصل. ======
export async function getOnlineUsers() {
  const { data } = await client.get('/chat/online');
  return data.user_ids || [];
}
