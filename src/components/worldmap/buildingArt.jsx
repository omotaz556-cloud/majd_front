import { useId } from 'react';

// ====== لوحة رسم مشتركة لكل مبنى: أرضية بيضاوية (ظل) + مسقط "بلوك" إيزومتري
// عام (جدارين + سقف) نقدر نبني فوقه تفاصيل كل مبنى (أبراج، سقوف مخروطية،
// أكوام موارد...) - نفس فكرة أي أصول RTS تجارية: شكل عام موحد + طبقات تفاصيل. ======

function IsoBlock({ cx, baseY, bw, bh, wallH, colors }) {
  const N = [cx, baseY - 2 * bh];
  const E = [cx + bw, baseY - bh];
  const S = [cx, baseY];
  const W = [cx - bw, baseY - bh];
  const shift = (p) => [p[0], p[1] - wallH];
  const [Nt, Et, St, Wt] = [N, E, S, W].map(shift);
  const pts = (arr) => arr.map((p) => p.join(',')).join(' ');
  return (
    <>
      <polygon points={pts([W, S, St, Wt])} fill={colors.left} />
      <polygon points={pts([S, E, Et, St])} fill={colors.right} />
      <polygon points={pts([Nt, Et, St, Wt])} fill={colors.top} />
      <polygon points={pts([W, S, St, Wt])} fill="url(#wallShadeLeft)" />
    </>
  );
}

function GroundShadow({ cx, baseY, rx }) {
  return (
    <g filter="url(#buildingShadowBlur)">
      <ellipse cx={cx} cy={baseY + 6} rx={rx} ry={rx * 0.42} fill="#0d1a06" opacity="0.22" />
      <ellipse cx={cx} cy={baseY + 5} rx={rx * 0.72} ry={rx * 0.32} fill="#0d1a06" opacity="0.32" />
    </g>
  );
}

const CX = 60;
const BASE_Y = 168;
const BW = 52;
const BH = 24;

function Tower({ cx, baseY, wallH, roofColorId, height = 1 }) {
  const w = 15;
  const bh = 10;
  const top = baseY - wallH * height;
  return (
    <g>
      <rect x={cx - w / 2} y={top} width={w} height={wallH * height + bh} fill="#8a8f96" />
      <rect x={cx - w / 2} y={top} width={w * 0.42} height={wallH * height + bh} fill="#6e737a" />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={cx - w / 2 + i * (w / 2.6)} y={top - 6} width={4} height={6} fill="#5c6167" />
      ))}
      <polygon points={`${cx - w / 2 - 3},${top} ${cx + w / 2 + 3},${top} ${cx},${top - 22}`} fill={`url(#${roofColorId})`} stroke="#1c2c44" strokeWidth="1" />
    </g>
  );
}

function MainCastle({ level, roofId }) {
  const wallH = 58 + Math.min(level - 1, 10) * 3;
  const bw = BW + 6;
  const bh = BH + 3;
  const ry = BASE_Y - 2 * bh - wallH;
  return (
    <>
      <GroundShadow cx={CX} baseY={BASE_Y} rx={58} />
      <IsoBlock
        cx={CX}
        baseY={BASE_Y}
        bw={bw}
        bh={bh}
        wallH={wallH}
        colors={{ left: '#8f959c', right: '#b7bcc2', top: '#dfe3e7' }}
      />
      {/* شرفات أعلى السور */}
      {[-1, 0, 1].map((i) => (
        <rect key={i} x={CX + i * 14 - 5} y={ry - 6} width="10" height="8" fill="#c7cbd0" stroke="#7d838a" strokeWidth="0.75" />
      ))}
      <Tower cx={CX - bw + 10} baseY={BASE_Y - bh - 4} wallH={wallH * 0.85} roofColorId={roofId} />
      <Tower cx={CX + bw - 10} baseY={BASE_Y - bh - 4} wallH={wallH * 0.85} roofColorId={roofId} />
      {/* البرج المركزي + السقف المخروطي الأزرق */}
      <rect x={CX - 20} y={ry - 34} width="40" height="34" fill="#c7cbd0" />
      <rect x={CX - 20} y={ry - 34} width="16" height="34" fill="#a7acb3" />
      <polygon points={`${CX - 24},${ry - 34} ${CX + 24},${ry - 34} ${CX},${ry - 74}`} fill={`url(#${roofId})`} stroke="#1c2c44" strokeWidth="1.2" />
      <rect x={CX - 1.5} y={ry - 74} width="3" height="18" fill="#5c6167" />
      <polygon points={`${CX},${ry - 92} ${CX + 13},${ry - 86} ${CX},${ry - 80}`} fill="#c23b3b" />
      {/* باب مقنطر */}
      <path d={`M ${CX - 9} ${BASE_Y - bh} v -16 a 9 9 0 0 1 18 0 v 16 z`} fill="#3a2a18" />
      {/* شبابيك متوهجة خفيفة */}
      <circle cx={CX - 30} cy={ry + 12} r="3.4" fill="#ffe9a8" opacity="0.9" />
      <circle cx={CX + 30} cy={ry + 12} r="3.4" fill="#ffe9a8" opacity="0.9" />
    </>
  );
}

function GoldMine({ level }) {
  const wallH = 30 + Math.min(level - 1, 10) * 1.6;
  const ry = BASE_Y - 2 * BH - wallH;
  return (
    <>
      <GroundShadow cx={CX} baseY={BASE_Y} rx={46} />
      <IsoBlock cx={CX} baseY={BASE_Y} bw={BW} bh={BH} wallH={wallH} colors={{ left: '#5c6672', right: '#7c8894', top: '#a3aeb8' }} />
      {/* مدخل النفق */}
      <ellipse cx={CX} cy={ry + 6} rx="17" ry="9" fill="#241d16" />
      <ellipse cx={CX} cy={ry + 6} rx="17" ry="9" fill="none" stroke="#3a2f22" strokeWidth="2" />
      {/* دعامات خشبية */}
      <rect x={CX - 24} y={ry - 10} width="7" height="20" fill="#7c5a30" transform={`rotate(-6 ${CX - 24} ${ry - 10})`} />
      <rect x={CX + 17} y={ry - 10} width="7" height="20" fill="#7c5a30" transform={`rotate(6 ${CX + 17} ${ry - 10})`} />
      <rect x={CX - 26} y={ry - 13} width="52" height="6" fill="#95713b" />
      {/* عربة تعدين + كومة تبر دهب */}
      <g transform={`translate(${CX + 30} ${BASE_Y - 14})`}>
        <rect x="-10" y="-8" width="20" height="10" rx="1.5" fill="#4a3a26" />
        <circle cx="-6" cy="3" r="3.4" fill="#241d16" />
        <circle cx="6" cy="3" r="3.4" fill="#241d16" />
      </g>
      {[[-30, -2], [10, -14], [-8, -20], [26, -1], [0, -8]].map(([dx, dy], i) => (
        <circle key={i} cx={CX + dx} cy={ry + dy} r="3.6" fill="#f4cf5a" stroke="#a97b0e" strokeWidth="0.6" />
      ))}
    </>
  );
}

function WoodMill({ level, roofId }) {
  const wallH = 32 + Math.min(level - 1, 10) * 1.7;
  const ry = BASE_Y - 2 * BH - wallH;
  return (
    <>
      <GroundShadow cx={CX} baseY={BASE_Y} rx={48} />
      <IsoBlock cx={CX} baseY={BASE_Y} bw={BW} bh={BH} wallH={wallH} colors={{ left: '#5a4326', right: '#7c5c34', top: '#a3793f' }} />
      <polygon points={`${CX - 34},${ry} ${CX + 34},${ry} ${CX},${ry - 30}`} fill={`url(#${roofId})`} stroke="#3a2a18" strokeWidth="1" />
      <rect x={CX - 4} y={ry - 30} width="8" height="12" fill="#5a4326" />
      {/* عجلة نشر خشبية */}
      <g transform={`translate(${CX + 34} ${ry - 6})`}>
        <circle r="13" fill="#8a5a2a" stroke="#3a2a18" strokeWidth="2" />
        <circle r="4" fill="#c9c0b0" />
        {Array.from({ length: 8 }).map((_, i) => {
          const ang = (i * Math.PI) / 4;
          return <line key={i} x1={0} y1={0} x2={Math.cos(ang) * 12} y2={Math.sin(ang) * 12} stroke="#c9c0b0" strokeWidth="1.6" />;
        })}
      </g>
      {/* كومة جذوع خشب */}
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${CX - 44 + i * 2.5} ${BASE_Y - 6 - i * 7})`}>
          <ellipse rx="14" ry="6" fill="#8a5a2a" stroke="#3a2a18" strokeWidth="1.4" />
          <ellipse rx="5" ry="2.2" fill="#c9995a" />
        </g>
      ))}
    </>
  );
}

function StoneQuarry({ level }) {
  const wallH = 20 + Math.min(level - 1, 10) * 1.2;
  const ry = BASE_Y - 2 * BH - wallH;
  const rocks = [
    [-18, -2, 13],
    [8, -10, 16],
    [-3, 5, 10],
    [22, -1, 10],
    [-26, 3, 8],
  ];
  return (
    <>
      <GroundShadow cx={CX} baseY={BASE_Y} rx={50} />
      <IsoBlock cx={CX} baseY={BASE_Y} bw={BW} bh={BH} wallH={wallH} colors={{ left: '#5c6672', right: '#7c8894', top: '#a3aeb8' }} />
      {rocks.map(([dx, dy, r], i) => {
        const grad = `url(#quarryRock${i % 2})`;
        return (
          <polygon
            key={i}
            points={`${CX + dx - r},${ry + dy} ${CX + dx - r * 0.3},${ry + dy - r * 0.95} ${CX + dx + r * 0.45},${ry + dy - r * 0.75} ${CX + dx + r},${ry + dy} ${CX + dx + r * 0.3},${ry + dy + r * 0.55} ${CX + dx - r * 0.4},${ry + dy + r * 0.5}`}
            fill={grad}
            stroke="#2c2f36"
            strokeWidth="1.4"
          />
        );
      })}
      {/* رافعة خشبية بسيطة */}
      <line x1={CX - 10} y1={ry - 4} x2={CX + 4} y2={ry - 20} stroke="#7c5a30" strokeWidth="3.4" strokeLinecap="round" />
      <line x1={CX - 4} y1={ry - 15} x2={CX + 8} y2={ry - 20} stroke="#c9c0b0" strokeWidth="2.2" strokeLinecap="round" />
    </>
  );
}

function Barracks({ level, roofId }) {
  const wallH = 34 + Math.min(level - 1, 10) * 1.8;
  const bw = BW - 2;
  const bh = BH - 2;
  const ry = BASE_Y - 2 * bh - wallH;
  return (
    <>
      <GroundShadow cx={CX} baseY={BASE_Y} rx={50} />
      <IsoBlock cx={CX} baseY={BASE_Y} bw={bw} bh={bh} wallH={wallH} colors={{ left: '#6b4a34', right: '#8f6446', top: '#b9855c' }} />
      {/* سقف خيمي مثلث */}
      <polygon points={`${CX - 32},${ry} ${CX + 32},${ry} ${CX},${ry - 26}`} fill={`url(#${roofId})`} stroke="#3a2214" strokeWidth="1" />
      {/* راية حمراء أعلى السقف */}
      <line x1={CX} y1={ry - 26} x2={CX} y2={ry - 42} stroke="#5c4326" strokeWidth="2" />
      <polygon points={`${CX},${ry - 42} ${CX + 14},${ry - 37} ${CX},${ry - 32}`} fill="#b3372c" stroke="#6e1e17" strokeWidth="0.8" />
      {/* مدخل مقنطر مظلم */}
      <path d={`M ${CX - 10} ${BASE_Y - bh} v -14 a 10 10 0 0 1 20 0 v 14 z`} fill="#241209" />
      {/* سيفان متقاطعان جنب المدخل */}
      <g transform={`translate(${CX + 26} ${BASE_Y - bh - 6})`}>
        <line x1="-9" y1="9" x2="9" y2="-9" stroke="#c7cbd0" strokeWidth="2.6" strokeLinecap="round" />
        <line x1="-9" y1="-9" x2="9" y2="9" stroke="#c7cbd0" strokeWidth="2.6" strokeLinecap="round" />
        <circle r="2.6" fill="#8a6a2a" />
      </g>
      {/* براميل تخزين جنب الثكنة */}
      {[[-30, -1], [-24, -9]].map(([dx, dy], i) => (
        <g key={i} transform={`translate(${CX + dx} ${BASE_Y + dy})`}>
          <ellipse rx="9" ry="4.4" fill="#7c5a30" stroke="#3a2a18" strokeWidth="1.2" />
          <ellipse cy="-6" rx="9" ry="4" fill="#95713b" stroke="#3a2a18" strokeWidth="1.2" />
        </g>
      ))}
    </>
  );
}

// ====== FIX (missing building sprite placeholders) - مباني ديكور القلاع
// الـNPC (npcCastle.generator.CITY_DECOR_TYPES: إسطبل/ميدان رماية/ورشة
// حصار/مخزن/مستشفى/أكاديمية/دار تحالف) لسه معندهاش رسمة مخصصة زي المباني
// الحقيقية (MainCastle/GoldMine/WoodMill/StoneQuarry/Barracks) - بدل ما
// REGISTRY[type] يرجع undefined ويقع الكومبوننت، أو يستعير رسمة StoneQuarry
// بشكل مربك، كل نوع منهم بياخد نفس اللوحة العامة (IsoBlock) بلون مميّز +
// حرف/رمز بسيط فوقه يوضّح إنها placeholder لحد ما تتعمل رسمة حقيقية ليها -
// نفس فلسفة الملف: شكل عام موحّد + تفاصيل بسيطة فوقه. ======
function DecorPlaceholder({ level, roofId, label, wallColors }) {
  const wallH = 26 + Math.min(level - 1, 4) * 3;
  const bw = BW - 6;
  const bh = BH - 4;
  const ry = BASE_Y - 2 * bh - wallH;
  return (
    <>
      <GroundShadow cx={CX} baseY={BASE_Y} rx={42} />
      <IsoBlock cx={CX} baseY={BASE_Y} bw={bw} bh={bh} wallH={wallH} colors={wallColors} />
      <polygon points={`${CX - 26},${ry} ${CX + 26},${ry} ${CX},${ry - 20}`} fill={`url(#${roofId})`} stroke="#1c2c44" strokeWidth="1" />
      {/* ====== شارة placeholder بسيطة (حرف أول اسم المبنى) - علامة واضحة
          إنها لسه رسمة مبدئية مش نهائية. ====== */}
      <circle cx={CX} cy={ry - 4} r="10" fill="#241f18" stroke="#c7cbd0" strokeWidth="1.4" />
      <text x={CX} y={ry - 0.5} textAnchor="middle" fontSize="11" fontWeight="700" fill="#e8d9a0">
        {label}
      </text>
    </>
  );
}

const DECOR_PLACEHOLDER_DEFS = {
  stable: { label: 'إ', colors: { left: '#6b4a34', right: '#8f6446', top: '#b9855c' } },
  archery_range: { label: 'ر', colors: { left: '#5a6b3a', right: '#7c8f4e', top: '#a3b366' } },
  siege_workshop: { label: 'ح', colors: { left: '#5c6672', right: '#7c8894', top: '#a3aeb8' } },
  warehouse: { label: 'خ', colors: { left: '#5a4326', right: '#7c5c34', top: '#a3793f' } },
  hospital: { label: 'م', colors: { left: '#6e6e78', right: '#8f8f9c', top: '#c2c2cc' } },
  academy: { label: 'أ', colors: { left: '#3a4a6b', right: '#4e628f', top: '#6684b9' } },
  alliance_hall: { label: 'د', colors: { left: '#6b3a4a', right: '#8f4e62', top: '#b96684' } },
};

function makeDecorPlaceholder(defKey) {
  const def = DECOR_PLACEHOLDER_DEFS[defKey];
  return function DecorPlaceholderInstance({ level, roofId }) {
    return <DecorPlaceholder level={level} roofId={roofId} label={def.label} wallColors={def.colors} />;
  };
}

const REGISTRY = {
  main_castle: MainCastle,
  town_hall: MainCastle,
  gold_mine: GoldMine,
  wood_mill: WoodMill,
  sawmill: WoodMill,
  stone_quarry: StoneQuarry,
  quarry: StoneQuarry,
  barracks: Barracks,
  // ====== placeholders - راجع generateCityDecor في npcCastle.generator.js.
  // كل واحد فيهم لسه شكل عام (IsoBlock + شارة حرف) لحد ما يتعمل له تصميم
  // نهائي مخصص زي باقي المباني فوق - مش أي تعديل مطلوب هنا وقت ما ده يحصل،
  // بس تستبدل الدالة في REGISTRY. ======
  stable: makeDecorPlaceholder('stable'),
  archery_range: makeDecorPlaceholder('archery_range'),
  siege_workshop: makeDecorPlaceholder('siege_workshop'),
  warehouse: makeDecorPlaceholder('warehouse'),
  hospital: makeDecorPlaceholder('hospital'),
  academy: makeDecorPlaceholder('academy'),
  alliance_hall: makeDecorPlaceholder('alliance_hall'),
};

export function BuildingSprite({ type, level = 1, selected, width = 140, height = 200 }) {
  const reactId = useId();
  const roofId = `castleRoof-${reactId}`;
  const millRoofId = `millRoof-${reactId}`;
  const barracksRoofId = `barracksRoof-${reactId}`;
  const Comp = REGISTRY[type] || StoneQuarry;

  let activeRoofId = roofId;
  if (type === 'wood_mill' || type === 'sawmill') activeRoofId = millRoofId;
  else if (type === 'barracks') activeRoofId = barracksRoofId;

  return (
    <svg
      viewBox="0 0 120 190"
      width={width}
      height={height}
      className={`pointer-events-none transition-transform duration-200 ${selected ? '-translate-y-1.5' : ''}`}
      style={{
        filter: selected
          ? 'drop-shadow(0 0 12px rgba(255,214,102,.8)) drop-shadow(0 8px 10px rgba(0,0,0,.5))'
          : 'drop-shadow(0 8px 8px rgba(0,0,0,.4))',
      }}
    >
      <defs>
        <filter id="buildingShadowBlur" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <linearGradient id="wallShadeLeft" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#000" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={roofId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5f89c9" />
          <stop offset="100%" stopColor="#274a7d" />
        </linearGradient>
        <linearGradient id={millRoofId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b5623a" />
          <stop offset="100%" stopColor="#7c3f22" />
        </linearGradient>
        <linearGradient id={barracksRoofId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8a3a2c" />
          <stop offset="100%" stopColor="#5c2418" />
        </linearGradient>
        <linearGradient id="quarryRock0" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b8bcc2" />
          <stop offset="100%" stopColor="#7c828a" />
        </linearGradient>
        <linearGradient id="quarryRock1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a3aab2" />
          <stop offset="100%" stopColor="#686e76" />
        </linearGradient>
      </defs>
      <Comp level={level} roofId={activeRoofId} />
      {selected && (
        <ellipse cx={CX} cy={BASE_Y + 3} rx="60" ry="16" fill="none" stroke="#ffd666" strokeWidth="2.5" opacity="0.9" />
      )}
    </svg>
  );
}

export default BuildingSprite;
