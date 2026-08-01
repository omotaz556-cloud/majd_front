import client from './client';

// ====== ملف تعريف عام للاعب (View Player Profile) - وقت زيارة مملكة لاعب
// حقيقي تاني من خريطة العالم ======
export async function getPlayerProfile(userId) {
  const { data } = await client.get(`/users/${userId}/profile`);
  return data;
}

// ====== تغيير كلمة المرور - متاحة بس لحسابات auth_provider='local' ======
export async function changePassword({ current_password, new_password }) {
  const { data } = await client.post('/users/change-password', { current_password, new_password });
  return data; // { success: true }
}