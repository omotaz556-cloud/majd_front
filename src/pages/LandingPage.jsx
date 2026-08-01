import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  PlayCircle,
  Sparkles,
  ShieldCheck,
  Gift,
  Coins,
  Swords,
  Trophy,
  ChevronLeft,
} from 'lucide-react';
import HeroSquiggles from '../components/ui/HeroSquiggles';

// معلومات اللعبة الثابتة (بدون نداء API) - الصفحة دي بتتعرض قبل تسجيل الدخول
// فمفيش رصيد/توكن نعرضه، بس عرض تسويقي للعبة الوحيدة المتاحة على المنصة
// (محرك القلاع الاستراتيجي) - نظام الأركيد القديم (Puzzle Rush/Arcade
// Dash/Timing Tap وكل التحديات/التصنيف المرتبطة بيه) اتشال بالكامل.
const SHOWCASE_GAMES = [
  {
    name: 'محرك القلاع الاستراتيجي',
    slug: 'castle-engine',
    label: 'استراتيجية',
    image: '/images/game-worldmap-cover.svg',
    description: 'ابنِ قلعتك، درّب جيوشك، كوّن تحالف، وقاتل لاعبين حقيقيين على خريطة عالم مفتوحة - كل ده مجانًا.',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'ابني قلعتك',
    desc: 'ادخل عالم محرك القلاع الاستراتيجي وابدأ ببناء وتطوير قلعتك من الصفر.',
    icon: Sparkles,
  },
  {
    n: '02',
    title: 'اشحن رصيدك أو العب مجانًا',
    desc: 'اللعبة ليها نسخة مجانية بالكامل، وتقدر تشحن كوينز عشان تسرّع تطورك جوه اللعبة.',
    icon: Coins,
  },
  {
    n: '03',
    title: 'كوّن جيشك وتحالفك',
    desc: 'درّب جيشك، انضم لتحالف، وادخل معارك حقيقية مع لاعبين تانيين على خريطة العالم.',
    icon: Trophy,
  },
];

const BENEFITS = [
  {
    icon: ShieldCheck,
    title: 'عالم لعب عادل وموثوق',
    desc: 'كل نتيجة معركة بتتحسب بقواعد واضحة وموثّقة، عشان تفضل المنافسة عادلة للكل.',
  },
  {
    icon: Swords,
    title: 'تحالفات ومعارك حقيقية',
    desc: 'كوّن تحالف مع لاعبين تانيين، ادعموا بعض بالتعزيزات، وخوضوا معارك حقيقية على خريطة العالم.',
  },
  {
    icon: Gift,
    title: 'كوينز من غير ما تدفع',
    desc: 'مش لازم تشحن رصيد عشان تلعب - شاهد إعلان قصير واكسب كوينز إضافية تستخدمها جوه اللعبة.',
  },
  {
    icon: Coins,
    title: 'شحن آمن وسريع',
    desc: 'شحن الرصيد بيتم عن طريق بوابة دفع موثوقة، وأي عملية بتتسجل وتظهر فورًا في محفظتك.',
  },
];

function ShowcaseCard({ game, index }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: 'easeOut' }}
      className="group [perspective:1200px]"
    >
      {/* ====== الكارت بيلف 180 درجة (Y axis) لما تعمل hover عليه (ديسكتوب)
          أو تدوس عليه (موبايل) - الوش فيه صورة اللعبة، والضهر فيه شرح
          مبسط عنها. flipped state بتتحكم في الدوران بدل ما نعتمد بس على
          CSS :hover عشان يشتغل باللمس على الموبايل كمان. ====== */}
      <div
        onClick={() => setFlipped((f) => !f)}
        className="relative aspect-[3/4] w-full cursor-pointer [transform-style:preserve-3d] transition-transform duration-500 ease-out group-hover:[transform:rotateY(180deg)]"
        style={{ transform: flipped ? 'rotateY(180deg)' : undefined }}
      >
        {/* ====== الوش: صورة اللعبة ====== */}
        <div className="absolute inset-0 flex flex-col overflow-hidden rounded-3xl border border-ink-600 bg-ink-800 shadow-card [backface-visibility:hidden]">
          <div className="relative flex-1 overflow-hidden">
            <img
              src={game.image}
              alt={game.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink-950 via-ink-950/50 to-transparent" />
            <span className="eyebrow absolute right-4 top-4 rounded-full border border-teal/40 bg-ink-950/55 px-2.5 py-1 text-teal">
              {game.label}
            </span>
            <div className="absolute inset-x-5 bottom-5">
              <h3 className="font-display text-xl font-extrabold text-bone">{game.name}</h3>
            </div>
          </div>
          <Link
            to="/register"
            onClick={(e) => e.stopPropagation()}
            className="focus-ring flex items-center justify-center gap-2 border-t border-ink-600 py-3 text-sm font-bold text-bone/70 transition-colors hover:bg-teal/10 hover:text-teal"
          >
            <PlayCircle size={15} />
            العب الآن
          </Link>
        </div>

        {/* ====== الضهر: شرح مبسط عن اللعبة ====== */}
        <div className="absolute inset-0 flex flex-col justify-between rounded-3xl border border-teal/30 bg-ink-800 p-5 text-center shadow-card [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <span className="eyebrow rounded-full border border-teal/40 bg-teal/5 px-2.5 py-1 text-teal">
              {game.label}
            </span>
            <h3 className="font-display text-lg font-extrabold text-bone">{game.name}</h3>
            <p className="text-sm leading-relaxed text-bone/65">{game.description}</p>
          </div>
          <Link
            to="/register"
            onClick={(e) => e.stopPropagation()}
            className="focus-ring btn-gradient-teal flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold"
          >
            <PlayCircle size={15} />
            العب الآن
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export default function LandingPage() {
  return (
    <div>
      {/* ================= Hero ================= */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 right-1/2 h-[520px] w-[520px] translate-x-1/2 rounded-full bg-teal/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-[320px] w-[320px] rounded-full bg-gold/10 blur-3xl" />
        </div>
        <HeroSquiggles />

        <div className="relative mx-auto max-w-4xl px-4 pb-16 pt-16 text-center sm:pb-24 sm:pt-24">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="eyebrow inline-flex items-center gap-2 rounded-full border border-teal/30 bg-teal/5 px-4 py-1.5"
          >
            <Sparkles size={12} />
            منصة ألعاب مجد
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="section-heading mt-5 text-4xl leading-tight sm:text-6xl"
          >
            اثبت مهارتك<span className="text-gold">،</span> واكسب مجدك
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="mx-auto mt-4 max-w-xl text-base text-bone/65 sm:text-lg"
          >
            ألعاب سريعة، نتائج موثقة، ومكافآت حقيقية على كل تحدي تدخله.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              to="/register"
              className="focus-ring btn-gradient-teal flex items-center gap-2 rounded-xl px-6 py-3 text-sm sm:text-base"
            >
              <PlayCircle size={18} />
              إنشاء حساب مجاني
            </Link>
            <a href="#games" className="btn-outline focus-ring rounded-xl px-6 py-3 text-sm sm:text-base">
              شوف الألعاب
            </a>
          </motion.div>
        </div>
      </section>

      {/* ================= ساحة الألعاب ================= */}
      <section id="games" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:py-20">
        <div className="mb-8 text-center sm:mb-10">
          <span className="eyebrow">ساحة ألعابنا</span>
          <h2 className="section-heading mt-2 text-2xl sm:text-3xl">جاهزين؟</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-1">
          <div className="mx-auto w-full max-w-xs">
            {SHOWCASE_GAMES.map((g, i) => (
              <ShowcaseCard key={g.slug} game={g} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ================= كيف يعمل ================= */}
      <section className="border-y border-ink-600 bg-ink-950/40">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
          <div className="mb-12 text-center">
            <span className="eyebrow">كيف يعمل</span>
            <h2 className="section-heading mt-2 text-2xl sm:text-3xl">3 خطوات تفصلك عن أول مكافأة</h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.n}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="relative rounded-2xl border border-ink-600 bg-ink-800/60 p-6"
                >
                  <span className="font-mono text-4xl font-bold text-bone/10">{step.n}</span>
                  <div className="mt-3 inline-flex rounded-xl bg-teal/10 p-2.5 text-teal">
                    <Icon size={20} />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-bold text-bone">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-bone/60">{step.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= ليه مجد ================= */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="mb-10 text-center">
          <span className="eyebrow">ليه مجد؟</span>
          <h2 className="section-heading mt-2 text-2xl sm:text-3xl">منصة مبنية على الثقة والمتعة</h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((b, i) => {
            const Icon = b.icon;
            return (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="glass-card rounded-2xl p-5"
              >
                <div className="inline-flex rounded-xl bg-gold/10 p-2.5 text-gold">
                  <Icon size={20} />
                </div>
                <h3 className="mt-4 font-display text-base font-bold text-bone">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-bone/60">{b.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ================= CTA ختامي ================= */}
      <section className="mx-auto max-w-4xl px-4 pb-20 text-center">
        <div className="glass-panel rounded-3xl px-6 py-12 sm:px-12">
          <h2 className="section-heading text-2xl sm:text-3xl">جاهز تدخل أول تحدي؟</h2>
          <p className="mx-auto mt-3 max-w-md text-bone/60">
            إنشاء الحساب مجاني، وأول لعبة على المنصة من غير أي رصيد.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/register"
              className="focus-ring btn-gradient-gold flex items-center gap-2 rounded-xl px-6 py-3 text-sm sm:text-base"
            >
              إنشاء حساب
              <ChevronLeft size={16} />
            </Link>
            <Link to="/login" className="btn-outline focus-ring rounded-xl px-6 py-3 text-sm sm:text-base">
              عندي حساب بالفعل
            </Link>
          </div>
        </div>
      </section>

      {/* ================= فوتر ================= */}
      <footer className="border-t border-ink-600 px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-bone/40 sm:flex-row">
          <span className="font-display font-bold text-bone/60">
            مجد<span className="text-gold">.</span>
          </span>
          <div className="flex gap-5">
            <a href="#" className="hover:text-bone/70">
              الشروط والأحكام
            </a>
            <a href="#" className="hover:text-bone/70">
              سياسة الخصوصية
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}