// ====== "قلاع مفضّلة" (Bookmark) - مفيش endpoint في الباك إند للميزة دي
// لسه، فبنخزّنها محليًا في المتصفح (localStorage) بس عشان تفضل شغالة فعليًا
// من غير ما نستنى تطوير باك إند كامل ليها. لو حبينا مستقبلًا نخليها متزامنة
// بين الأجهزة، ده هيحتاج جدول/راوت جديد في الباك إند - الملف ده هو المكان
// الوحيد اللي هيحتاج يتغيّر وقتها.
//
// كل بوكماركة بتتخزن كأوبچكت كامل (اسم اللاعب/أرقامه/تحالفه/قوته/إحداثياته
// - نفس شكل نتيجة بحث العالم بالظبط) مش مجرد رقم ID، عشان قايمة "المفضّلة"
// تقدر تتعرض وتتفتح ("اذهب للقلعة") من غير ما تحتاج تعمل بحث تاني كل مرة. ======

const STORAGE_KEY = 'majd_castle_bookmarks';

function readAll() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    // توافق مع الشكل القديم (array من أرقام/نصوص IDs بس) - لو لاقينا سطر
    // قديم من الشكل ده، بنتجاهله (مفيش بيانات كافية نعرضها بيها) بدل ما
    // نكسر الصفحة.
    return parsed.filter((b) => b && typeof b === 'object' && b.castle_id);
  } catch {
    return [];
  }
}

function writeAll(bookmarks) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  } catch {
    // مفيش أي حاجة نعملها لو التخزين المحلي مش متاح (وضع تصفح خاص مثلًا) -
    // الميزة بترجع مجرد no-op بدل ما توقع الصفحة كلها
  }
}

export function getBookmarks() {
  return readAll();
}

export function isCastleBookmarked(castleId) {
  if (!castleId) return false;
  const id = String(castleId);
  return readAll().some((b) => String(b.castle_id) === id);
}

// بيضيف/يشيل بوكماركة - result لازم يكون بنفس شكل نتيجة بحث العالم (لازم
// يحتوي castle_id على الأقل). بيرجّع الحالة الجديدة (true لو بقت محفوظة،
// false لو اتشالت).
export function toggleCastleBookmark(result) {
  if (!result?.castle_id) return false;
  const id = String(result.castle_id);
  const current = readAll();
  const exists = current.some((b) => String(b.castle_id) === id);
  const next = exists
    ? current.filter((b) => String(b.castle_id) !== id)
    : [...current, { ...result, castle_id: id, saved_at: Date.now() }];
  writeAll(next);
  return !exists;
}

export function removeBookmark(castleId) {
  if (!castleId) return;
  const id = String(castleId);
  writeAll(readAll().filter((b) => String(b.castle_id) !== id));
}
