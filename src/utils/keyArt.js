// كل لعبة مالهاش صورة حقيقية (Poster/Key Art)، فبدل أيقونة صغيرة جوه مربع رمادي،
// بنولّد "غلاف" مميز لكل لعبة بناءً على الاسم/slug بتاعها - ثابت دايمًا لنفس اللعبة
// (نفس الألوان والزاوية كل مرة)، عشان يبقى للموقع هوية بصرية شبه "بوستر الألعاب"
// في Epic/Poki من غير ما نحتاج أصول رسومية حقيقية.

// كل مجموعة هنا عبارة عن 3 ألوان (خلفية غامقة -> متوسطة -> لمعة مارکيز) + زاوية الميل.
// لوحات ألوان "مارکيز أركيد سعودية" - قواعد دافئة (بني/زيتوني/كحلي دافئ)
// مع لمعة أخضر/ذهبي/عنابي، بدل تدرجات الكاربون فايبر والنيون البارد القديمة.
const PALETTES = [
  ['#2a1a0c', '#5c3a1a', '#b5432e'], // بني دافئ -> عنابي/طوبي
  ['#1a2416', '#2f4a30', '#00875a'], // زيتوني غامق -> أخضر سعودي
  ['#241004', '#5c320a', '#d4a017'], // بني محروق -> ذهبي تذاكر
  ['#14201f', '#1f3a3a', '#1c3d5a'], // كحلي دافئ -> أزرق بترولي
  ['#2a0a16', '#5c1f22', '#d64545'], // عنابي غامق -> أحمر دافئ
  ['#12241c', '#1f3a2e', '#2be8c8'], // أخضر غامق -> فيروزي فاتح
];

export function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// بيرجع { background, accent, dark, mid } جاهزين للاستخدام كـ inline style
// أو كألوان لرسمة SVG (زي GamePosterArt) على أي عنصر
export function getKeyArt(seed = '') {
  const hash = hashString(String(seed));
  const [dark, mid, accent] = PALETTES[hash % PALETTES.length];
  const angle = 115 + (hash % 50); // 115°..165° - إحساس اتجاه ثابت بس متنوع شوية
  const posX = 20 + (hash % 60);
  const posY = 10 + ((hash >> 3) % 40);

  return {
    dark,
    mid,
    accent,
    background: `radial-gradient(120% 140% at ${posX}% ${posY}%, ${accent}33 0%, transparent 55%),
      linear-gradient(${angle}deg, ${dark} 0%, ${mid} 60%, ${dark} 100%)`,
  };
}

export default getKeyArt;
