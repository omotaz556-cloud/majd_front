// ====== صلاحيات أدوار التحالف (Permission-based actions) - نفس منطق
// الصلاحيات المطبّق في الباك إند (alliance.service::assertRole وكل
// service تاني بيستخدمها) بس هنا للعرض/التحكم في الواجهة بس (إخفاء/تعطيل
// أزرار) - أي تحقق حقيقي بيحصل في الباك إند برضه، الفرونت إند مجرد مرآة. ======

export const ROLE_LABELS = {
  leader: 'قائد',
  officer: 'ضابط',
  member: 'عضو',
};

export const MANAGE_ROLES = ['leader', 'officer'];

export function isLeader(role) {
  return role === 'leader';
}

export function canManage(role) {
  return MANAGE_ROLES.includes(role);
}

// بيرجع دور المستخدم الحالي جوه تحالف معيّن، أو null لو مش عضو
export function myRoleIn(alliance, userId) {
  if (!alliance || !userId) return null;
  const member = alliance.members?.find((m) => String(m.user_id) === String(userId));
  return member?.role || null;
}
