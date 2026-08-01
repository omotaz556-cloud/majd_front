// ====== تنسيق رقم كبير لشكل مختصر زي "10.5K" أو "2.3M" ====== 
// مستخدم في شريط موارد خريطة العالم عشان الأرقام الكبيرة (دهب/خشب/حجر)
// تفضل قصيرة وسهلة القراءة بدل ما تاخد مساحة كبيرة في الـ HUD.
const COMPACT_FORMATTER = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatCompactNumber(value) {
  const n = Number(value) || 0;
  if (n < 1000) return String(Math.floor(n));
  return COMPACT_FORMATTER.format(n);
}
