import { useEffect, useRef, useState } from 'react';
import { X, Loader2, FlaskConical, Sparkles, Gem, Crown, Star, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { initiateDeposit, mockCompleteDeposit, listActiveCoinPackages, getDepositStatus } from '../api/payments';
import { firePurchaseConfetti } from './ui/confetti';
import { toastError } from './ui/toast';
import { useSound } from './ui/SoundProvider';
import { useWalletBalance } from '../context/WalletBalanceContext';

const MOYASAR_JS_URL = 'https://cdn.jsdelivr.net/npm/moyasar-payment-form@2.2.10/dist/moyasar.umd.min.js';
const MOYASAR_CSS_URL = 'https://cdn.jsdelivr.net/npm/moyasar-payment-form@2.2.10/dist/moyasar.css';

// بنلوّن ونأيقن كل باقة حسب ترتيبها (بيتكرر لو الباقات أكتر من 4) - الباقات
// نفسها (الاسم والسعر وعدد الكوينز) بتيجي لايف من السيرفر عشان أي باقة الأدمن
// يضيفها من لوحة التحكم تظهر هنا فوراً من غير ما نلمس الكود.
const ICONS = [Sparkles, Gem, Star, Crown];
const ACCENTS = ['teal', 'blue', 'purple', 'gold'];

const ACCENT_STYLES = {
  teal: {
    border: 'border-teal/30 hover:border-teal/60',
    glow: 'hover:shadow-glow-teal',
    icon: 'text-teal bg-teal/10',
    ring: 'border-teal bg-teal/10 text-teal',
  },
  blue: {
    border: 'border-neon-blue/30 hover:border-neon-blue/60',
    glow: 'hover:shadow-glow-blue',
    icon: 'text-neon-blue bg-neon-blue/10',
    ring: 'border-neon-blue bg-neon-blue/10 text-neon-blue',
  },
  purple: {
    border: 'border-neon-purple/30 hover:border-neon-purple/60',
    glow: 'hover:shadow-glow-purple',
    icon: 'text-neon-purple bg-neon-purple/10',
    ring: 'border-neon-purple bg-neon-purple/10 text-neon-purple',
  },
  gold: {
    border: 'border-gold/30 hover:border-gold/60',
    glow: 'hover:shadow-glow-gold',
    icon: 'text-gold bg-gold/10',
    ring: 'border-gold bg-gold/10 text-gold',
  },
};

function loadMoyasarAssets() {
  if (!document.getElementById('moyasar-css')) {
    const link = document.createElement('link');
    link.id = 'moyasar-css';
    link.rel = 'stylesheet';
    link.href = MOYASAR_CSS_URL;
    document.head.appendChild(link);
  }

  if (window.Moyasar) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.getElementById('moyasar-js');
    if (existing) {
      existing.addEventListener('load', resolve);
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.id = 'moyasar-js';
    script.src = MOYASAR_JS_URL;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

export default function DepositModal({ open, onClose, onSuccess, initialAmount }) {
  const [packages, setPackages] = useState([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [packagesError, setPackagesError] = useState(null);
  const [amount, setAmount] = useState(initialAmount || null);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState(null);
  // choose | loading-form | form-ready | mock-ready | mock-processing | success | error
  const [stage, setStage] = useState('choose');
  const [errorMsg, setErrorMsg] = useState(null);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const formHostRef = useRef(null);
  const { sounds } = useSound();
  const { refresh: refreshWalletBalance } = useWalletBalance();

  useEffect(() => {
    if (!open) {
      setStage('choose');
      setErrorMsg(null);
      setCustomAmount('');
      setSelectedPackageId(null);
      setPaymentConfig(null);
      return;
    }

    if (initialAmount) {
      setAmount(initialAmount);
      setCustomAmount('');
    }

    // بنجيب الباقات الحقيقية من السيرفر في كل مرة المودال بيتفتح، عشان أي
    // باقة جديدة الأدمن ضايفها (أو أي تعديل سعر) تظهر فوراً من غير ريفريش للموقع.
    setPackagesLoading(true);
    setPackagesError(null);
    listActiveCoinPackages()
      .then((pkgs) => {
        setPackages(pkgs || []);
        if (!initialAmount && pkgs?.length) {
          setAmount((prev) => prev ?? pkgs[0].price);
          setSelectedPackageId((prev) => prev ?? pkgs[0]._id);
        }
      })
      .catch(() => {
        setPackagesError('تعذر تحميل باقات الشحن، جرّب تاني');
        setPackages([]);
      })
      .finally(() => setPackagesLoading(false));
  }, [open, initialAmount]);

  // بنستنى لحد ما الـ stage يبقى 'form-ready' عشان الـ div بتاع الفورم يكون
  // اترسم فعلاً في الـ DOM (formHostRef.current مش null) قبل ما نستدعي
  // Moyasar.init - ده هو الفيكس الأساسي لمشكلة "الفورم مش بيظهر".
  useEffect(() => {
    if (stage !== 'form-ready') return;
    if (!paymentConfig) return;
    if (!formHostRef.current) return; // الحاوية لسه مش موجودة في الـ DOM
    if (!window.Moyasar) return; // السكريبت لسه مش لودر

    // مهم: React 18 StrictMode (في وضع التطوير) بيشغل الـ useEffect مرتين على
    // نفس الـ mount، فلو معملناش guard هنا، Moyasar.init() هينده مرتين على نفس
    // الـ container، وده بيسبب مشاكل تهيئة غير متوقعة.
    if (formHostRef.current.dataset.mysrInitialized === 'true') return;
    formHostRef.current.dataset.mysrInitialized = 'true';

    const cfg = paymentConfig;
    const container = formHostRef.current;

    // ====== لوج تشخيصي مؤقت: بيوضح القيم الفعلية اللي بتتبعت لـ Moyasar.init
    // عشان نتأكد مفيش أي قيمة undefined/null قبل ما نشيله بعد التأكد ======
    console.log('[Moyasar Debug] payment_config:', {
      amount: cfg.amount,
      currency: cfg.currency,
      description: cfg.description,
      publishable_api_key: cfg.publishable_key,
      callback_url: cfg.callback_url,
      metadata: cfg.metadata,
    });

    window.Moyasar.init({
      element: container, // بنمرر عنصر الـ DOM مباشرة بدل الاعتماد على selector
      amount: cfg.amount,
      currency: cfg.currency,
      description: cfg.description,
      publishable_api_key: cfg.publishable_key,
      callback_url: cfg.callback_url,
      metadata: cfg.metadata,
      methods: ['creditcard'],
      // مهم جداً: Moyasar SDK v2.2.10 بيرفض init() كله برسالة "Form configuration
      // issue" لو on_completed مش async function (لازم يكون promise-based) -
      // ده مؤكد من رسالة الخطأ الفعلية في الـ console: "On completed must be
      // a promise based callback".
      on_completed: async function () {
        celebrateThenFinish({ givenId: cfg.given_id });
      },
    });

    return () => {
      // بنشيل الـ flag عند الـ cleanup عشان لو المودال اتقفل وفتح تاني بـ config
      // جديد، الفورم يقدر يتعمله init من جديد على الـ container الجديد.
      if (container) {
        delete container.dataset.mysrInitialized;
      }
    };
  }, [stage, paymentConfig]);

  const effectiveAmount = customAmount ? Number(customAmount) : amount;

  // ====== إعادة محاولة الـ refresh لحد ما رصيد المحفظة يتأكد فعلاً ======
  // مهم جداً: في وضع Moyasar الحقيقي، on_completed بتتنادى لحظة ما اللاعب
  // يخلص إدخال بيانات الكارت في الفورم - مش لما الدفع يتأكد فعليًا. الرصيد
  // الحقيقي بيتزود في الداتا بيز بس بعد ما webhook منفصل يوصل من سيرفرات
  // Moyasar للباك إند بتاعنا (ممكن ياخد كام ثانية). لو عملنا refresh واحدة
  // بس فورية هنا، هي هتجيب الرصيد القديم لأن الـ webhook لسه ماوصلش، ومحدش
  // هيعمل refresh تاني بعد كده - فالرقم في الواجهة (Navbar، World Map...)
  // هيفضل واقف حتى لو الرصيد الحقيقي في السيرفر زاد فعلاً.
  // الحل: بنستعلم عن حالة الإيداع نفسها (زي PaymentCallbackPage بالظبط)
  // لحد ما تستقر على paid، وبعدين نعمل refresh للمحفظة.
  async function waitForDepositThenRefresh(givenId) {
    const POLL_INTERVAL_MS = 2000;
    const MAX_POLLS = 12; // حوالي 24 ثانية

    for (let i = 0; i < MAX_POLLS; i += 1) {
      try {
        const data = await getDepositStatus(givenId);
        if (data.status === 'paid') {
          await refreshWalletBalance();
          return;
        }
        if (data.status === 'failed') {
          return; // مفيش داعي refresh - الرصيد ماتغيرش
        }
      } catch {
        // نتجاهل ونحاول تاني - ممكن يكون تأخير مؤقت في الشبكة
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
    // لو خلصنا الـ polling من غير ما نستقر على paid/failed، نعمل refresh
    // أخيرة على أمل إن الـ webhook يكون وصل، وبرضو منسيبش الواجهة معلقة.
    refreshWalletBalance();
  }

  function celebrateThenFinish(payload) {
    setStage('success');
    firePurchaseConfetti();
    sounds.coin?.();
    // نحاول refresh فوري (يفيد في وضع mock اللي فيه الرصيد بيتأكد قبل ما
    // نوصل هنا أصلاً)، وبالتوازي نبدأ الـ polling الحقيقي اللي هيلحق يحدث
    // الرصيد أول ما الـ webhook يوصل فعليًا في حالة Moyasar الحقيقي.
    refreshWalletBalance();
    if (payload?.givenId) {
      waitForDepositThenRefresh(payload.givenId);
    }
    setTimeout(() => {
      onSuccess?.(payload);
    }, 1100);
  }

  async function handleStartPayment() {
    if (!effectiveAmount || effectiveAmount <= 0) {
      setErrorMsg('اختار مبلغ صحيح أكبر من صفر');
      return;
    }

    setStage('loading-form');
    setErrorMsg(null);

    try {
      const packageIdToSend = customAmount ? null : selectedPackageId;
      const { payment_config: cfg } = await initiateDeposit(effectiveAmount, packageIdToSend);
      setPaymentConfig(cfg);

      if (cfg.provider === 'mock') {
        setStage('mock-ready');
        return;
      }

      // ملاحظة للمطورين: الرسالة دي بتظهر لو مفتاح Moyasar (publishable_key) ناقص
      // من إعدادات السيرفر - يعني بوابة الدفع الحقيقية لسه مش متظبطة.
      if (!cfg?.publishable_key) {
        throw new Error('بوابة الدفع مش متاحة دلوقتي، حاول تاني لاحقاً');
      }

      // مهم: مبنعملش Moyasar.init() هنا لسه، لأن الـ div بتاع الفورم (.majd-mysr-form)
      // لسه مترندرش في الـ DOM - هيترندر بس لما الـ stage يبقى 'form-ready'.
      // الـ init الفعلي بيحصل جوه useEffect تحت، بعد ما React يخلص يرسم الـ div.
      await loadMoyasarAssets();

      setStage('form-ready');
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'تعذر بدء عملية الدفع، حاول تاني';
      setErrorMsg(msg);
      toastError(msg);
      setStage('error');
    }
  }

  async function handleMockConfirm(success) {
    if (!paymentConfig) return;
    setStage('mock-processing');
    setErrorMsg(null);

    try {
      const result = await mockCompleteDeposit(paymentConfig.given_id, { success });
      if (result.status === 'paid') {
        celebrateThenFinish({ givenId: paymentConfig.given_id });
      } else {
        setErrorMsg('تم اختيار "فشل تجريبي" - الدفع اتسجل كفاشل');
        setStage('error');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'تعذر تأكيد الدفع الوهمي';
      setErrorMsg(msg);
      toastError(msg);
      setStage('error');
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/80 px-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="glass-panel w-full max-w-md rounded-2xl p-6"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-bone">متجر الكوينز</h2>
          <button
            onClick={onClose}
            className="focus-ring rounded-lg p-1.5 text-bone/50 hover:text-bone"
            aria-label="إغلاق"
          >
            <X size={20} />
          </button>
        </div>

        {stage === 'choose' && (
          <>
            <p className="mb-3 text-sm text-bone/60">اختار الباقة اللي تناسبك (ريال سعودي)</p>

            {packagesLoading && (
              <div className="mb-4 grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-24 animate-pulse rounded-xl border border-ink-600 bg-ink-800/80" />
                ))}
              </div>
            )}

            {!packagesLoading && packagesError && (
              <p className="mb-4 text-sm text-alert">{packagesError}</p>
            )}

            {!packagesLoading && !packagesError && packages.length === 0 && (
              <p className="mb-4 text-sm text-bone/50">مفيش باقات متاحة دلوقتي، اكتب مبلغ مخصص تحت</p>
            )}

            {!packagesLoading && packages.length > 0 && (
              <div className="mb-4 grid grid-cols-2 gap-3">
                {packages.map((pkg, i) => {
                  const Icon = ICONS[i % ICONS.length];
                  const accent = ACCENT_STYLES[ACCENTS[i % ACCENTS.length]];
                  const active = amount === pkg.price && !customAmount;
                  const totalCoins = pkg.coins_amount + (pkg.bonus_coins || 0);
                  return (
                    <motion.button
                      key={pkg._id}
                      whileHover={{ y: -3 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setAmount(pkg.price);
                        setCustomAmount('');
                        setSelectedPackageId(pkg._id);
                        sounds.click?.();
                      }}
                      className={`group relative flex flex-col items-center rounded-xl border bg-ink-800/80 p-4 shadow-glass transition-all ${accent.border} ${accent.glow} ${
                        active ? `${accent.ring} border-2` : ''
                      }`}
                    >
                      {pkg.badge && (
                        <span className="absolute -top-2 right-2 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-ink-900">
                          {pkg.badge}
                        </span>
                      )}
                      <span className={`mb-2 rounded-lg p-2.5 ${accent.icon}`}>
                        <Icon size={22} />
                      </span>
                      <span className="font-mono text-lg font-extrabold text-bone">
                        {pkg.price} {pkg.currency}
                      </span>
                      <span className="text-[11px] text-bone/50">{pkg.name}</span>
                      <span className="mt-1 flex items-center gap-1 text-[11px] text-gold">
                        <Coins size={11} />
                        {totalCoins}
                        {pkg.bonus_coins > 0 && <span className="text-teal">(+{pkg.bonus_coins} هدية)</span>}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            )}

            <input
              type="number"
              min="1"
              step="0.5"
              placeholder="مبلغ مخصص"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setSelectedPackageId(null);
              }}
              className="focus-ring mb-4 w-full rounded-lg border border-ink-600 bg-ink-700 px-4 py-2.5 text-bone placeholder:text-bone/40"
            />

            {errorMsg && <p className="mb-3 text-sm text-alert">{errorMsg}</p>}

            <button
              onClick={handleStartPayment}
              className="focus-ring btn-gradient-gold w-full rounded-lg py-2.5"
            >
              متابعة الدفع - {effectiveAmount || 0} ريال
            </button>
          </>
        )}

        {stage === 'loading-form' && (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 className="animate-spin text-gold" size={28} />
            <p className="text-sm text-bone/60">جاري تجهيز فورم الدفع الآمن...</p>
          </div>
        )}

        {stage === 'form-ready' && (
          <div>
            <p className="mb-3 text-xs text-bone/40">
              بياناتك بتتبعت مباشرة لبوابة الدفع (Moyasar) وميعديش على سيرفرنا خالص
            </p>
            <div className="majd-mysr-form" ref={formHostRef} />
          </div>
        )}

        {stage === 'mock-ready' && (
          <div>
            {/* ملاحظة للمطورين: البوابة شغّالة على وضع محاكاة حالياً لحد ما بيانات
                Moyasar الحقيقية توصل - غيّر PAYMENT_PROVIDER في .env عشان تفعّل
                شاشة الدفع الحقيقية بدل الشاشة دي. */}
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-gold/30 bg-gold/10 p-3 text-xs text-gold">
              <FlaskConical size={16} className="mt-0.5 shrink-0" />
              <p>هذه شاشة دفع تجريبية - مفيش دفع حقيقي هيحصل هنا.</p>
            </div>
            <p className="mb-4 text-sm text-bone/60">
              اضغط "تأكيد الدفع" عشان تحاكي نجاح عملية شحن بمبلغ {effectiveAmount} ريال.
            </p>
            {errorMsg && <p className="mb-3 text-sm text-alert">{errorMsg}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => handleMockConfirm(true)}
                className="focus-ring btn-gradient-gold flex-1 rounded-lg py-2.5"
              >
                تأكيد الدفع (وضع تجريبي)
              </button>
              <button
                onClick={() => handleMockConfirm(false)}
                className="focus-ring rounded-lg border border-ink-600 px-4 py-2.5 text-sm text-bone/60 hover:border-alert hover:text-alert"
              >
                محاكاة فشل
              </button>
            </div>
          </div>
        )}

        {stage === 'mock-processing' && (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 className="animate-spin text-gold" size={28} />
            <p className="text-sm text-bone/60">جاري تأكيد الدفع الوهمي...</p>
          </div>
        )}

        {stage === 'success' && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3 py-10 text-center"
            >
              <motion.span
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 0.6, repeat: 1 }}
                className="rounded-full bg-gold/15 p-4 text-gold shadow-glow-gold"
              >
                <Crown size={34} />
              </motion.span>
              <p className="font-display text-lg font-bold text-bone">تمت عملية الشحن بنجاح 🎉</p>
              <p className="text-sm text-bone/50">الرصيد في طريقه لمحفظتك الآن</p>
            </motion.div>
          </AnimatePresence>
        )}

        {stage === 'error' && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-alert">{errorMsg}</p>
            <button
              onClick={() => setStage('choose')}
              className="focus-ring rounded-lg border border-ink-600 px-4 py-1.5 text-sm text-bone/70 hover:border-gold hover:text-gold"
            >
              حاول تاني
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}