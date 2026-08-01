import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import Banner from '../ads/components/Banner';

// ====== صفحة "الألعاب" ======
// صفحة بسيطة بتعرض الألعاب المتاحة على المنصة. حاليًا في لعبة واحدة
// (خريطة العالم / Battle Plan) - بتفتح في المسار /world اللي شغّال
// full-screen زي ما هو من غير أي تغيير في WorldMapPage نفسها.
//
// دي كمان صفحة "الرئيسية" الفعلية لأي مستخدم مسجّل دخول (راجع HomeRoute في
// App.jsx) - فهي واحدة من الأماكن التلاتة المسموح فيها بانر إعلانات
// (Home/Games/Shop، راجع مهمة "Banner Ads" في التاسك) - مفيش بانر في
// WorldMapPage أو أي مكان جيمبلاي حي.
export default function GamesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Banner position="top" className="mb-6" />

      <div className="mb-8">
        <h1 className="font-display text-2xl font-extrabold text-bone">الألعاب</h1>
        <p className="mt-1 text-sm text-bone/60">اختَر لعبة وابدأ اللعب</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/world"
          className="group relative flex flex-col overflow-hidden rounded-2xl border border-ink-600 bg-ink-800/80 shadow-lg transition-colors hover:border-gold/50"
        >
          <div className="h-36 overflow-hidden">
            <img
              src="/images/game-worldmap-cover.svg"
              alt="خريطة العالم"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
          <div className="flex flex-1 flex-col gap-3 p-4">
            <div>
              <h2 className="font-display text-lg font-bold text-bone">مجد العرب </h2>
              <p className="mt-1 text-sm text-bone/60">
                ابنِ قلعتك، درّب جيوشك، وقاتل باقي اللاعبين على خريطة العالم
              </p>
            </div>
            <span className="focus-ring btn-gradient-teal mt-auto inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold">
              <Play size={15} />
              العب الآن
            </span>
          </div>
        </Link>
      </div>

      <Banner position="bottom" className="mt-8" />
    </div>
  );
}


