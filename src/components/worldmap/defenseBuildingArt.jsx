import { useId } from 'react';

// =============================================================================
// defenseBuildingArt - أصول بصرية حقيقية لكل نوع قطعة دفاعية (سور/بوابة/
// أبراج التلاتة/برج مراقبة/فخ/متراس)
// =============================================================================
// ====== نفس فلسفة buildingArt.jsx بالظبط: SVG إيزومتري مرسوم لحظيًا، مش
// صورة PNG - وبنفس مقاس اللوحة (viewBox 120x190، CX=60، BASE_Y=168) عشان
// القطع الدفاعية تبقى بنفس "حجم" وواقعية مباني القلعة العادية بدل شكل
// معين صغير مجرّد كان بيترسم قبل كده لكل الأنواع. كل نوع (type key) بقى
// له شكله الخاص وارتفاعه الخاص اللي بيكبر مع المستوى (level) - بالظبط
// زي MainCastle/GoldMine في buildingArt.jsx. ======

const CX = 60;
const BASE_Y = 168;
const BW = 52;
const BH = 24;

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
    </>
  );
}

function GroundShadow({ cx = CX, baseY = BASE_Y, rx = 58 }) {
  return (
    <g opacity="0.28">
      <ellipse cx={cx} cy={baseY + 6} rx={rx} ry={rx * 0.42} fill="#0d1a06" />
    </g>
  );
}

// ====== سور حجري - قطعة جدار عريضة بشرفات أعلاها، بترتفع مع المستوى
// (نفس فلسفة نمو wallH في MainCastle/GoldMine). ======
function WallArt({ level, destroyed }) {
  const wallH = 18 + Math.min(level - 1, 10) * 2.4;
  const bw = BW + 4;
  const bh = BH - 4;
  const ry = BASE_Y - 2 * bh - wallH;
  const colors = destroyed
    ? { left: '#57534e', right: '#736e68', top: '#8f8a84' }
    : { left: '#8f959c', right: '#b7bcc2', top: '#dfe3e7' };
  return (
    <>
      <GroundShadow rx={64} />
      <IsoBlock cx={CX} baseY={BASE_Y} bw={bw} bh={bh} wallH={wallH} colors={colors} />
      {!destroyed &&
        [-1, 0, 1].map((i) => (
          <rect key={i} x={CX + i * 16 - 5} y={ry - 6} width="10" height="8" fill={colors.top} stroke="#5c5852" strokeWidth="0.75" />
        ))}
      {destroyed && (
        <polygon points={`${CX - 10},${ry + 10} ${CX + 2},${ry - 6} ${CX - 2},${ry + 8} ${CX + 14},${ry - 4}`} fill="#3f3c39" opacity="0.55" />
      )}
    </>
  );
}

// ====== بوابة - قنطرة خشبية بين برجين حجريين، بتتفتح/تتقفل وممكن تتدمر ======
function GateArt({ level, open, destroyed }) {
  const wallH = 34 + Math.min(level - 1, 10) * 2.6;
  const towerColors = { left: '#7c8894', right: '#a3aeb8', top: '#c7cbd0' };
  const ry = BASE_Y - 2 * BH - wallH;
  const wood = destroyed ? '#3a2a18' : '#7c5a30';
  return (
    <>
      <GroundShadow rx={58} />
      <IsoBlock cx={CX - 30} baseY={BASE_Y - 6} bw={16} bh={10} wallH={wallH} colors={towerColors} />
      <IsoBlock cx={CX + 30} baseY={BASE_Y - 6} bw={16} bh={10} wallH={wallH} colors={towerColors} />
      {/* القنطرة العلوية بين البرجين */}
      <path d={`M ${CX - 30} ${ry - 6} Q ${CX} ${ry - 30} ${CX + 30} ${ry - 6} L ${CX + 30} ${ry + 6} Q ${CX} ${ry - 16} ${CX - 30} ${ry + 6} Z`} fill="#6f6a64" />
      {/* الدفة/الدفتين */}
      {destroyed ? (
        <>
          <rect x={CX - 20} y={ry + 2} width="16" height="26" fill={wood} transform={`rotate(-22 ${CX - 12} ${ry + 28})`} opacity="0.85" />
          <rect x={CX + 6} y={ry - 2} width="16" height="26" fill={wood} transform={`rotate(14 ${CX + 14} ${ry + 24})`} opacity="0.85" />
        </>
      ) : open ? (
        <>
          <rect x={CX - 30} y={ry + 8} width="9" height="26" fill={wood} />
          <rect x={CX + 21} y={ry + 8} width="9" height="26" fill={wood} />
        </>
      ) : (
        <>
          <rect x={CX - 20} y={ry + 4} width="20" height="30" fill={wood} />
          <rect x={CX} y={ry + 4} width="20" height="30" fill={wood} />
          <line x1={CX} y1={ry + 4} x2={CX} y2={ry + 34} stroke="#241a10" strokeWidth="1.4" />
        </>
      )}
    </>
  );
}

// ====== قاعدة برج مشتركة بين الأبراج التلاتة الحجرية (رمّاية/بالستا/
// منجنيق) - برج حجيري بيكبر ارتفاعه مع المستوى، وكل نوع بيضيف تفصيلة
// السلاح الخاصة بيه فوق منصته. ======
function TowerBase({ level, roofId, children }) {
  const wallH = 62 + Math.min(level - 1, 10) * 4;
  const bw = 22;
  const bh = 14;
  const ry = BASE_Y - 2 * bh - wallH;
  return (
    <>
      <GroundShadow rx={44} />
      <IsoBlock cx={CX} baseY={BASE_Y} bw={bw} bh={bh} wallH={wallH} colors={{ left: '#7c8894', right: '#a3aeb8', top: '#c7cbd0' }} />
      {[-1, 0, 1].map((i) => (
        <rect key={i} x={CX + i * 12 - 4} y={ry - 6} width="8" height="8" fill="#c7cbd0" stroke="#5c5852" strokeWidth="0.8" />
      ))}
      <g transform={`translate(0 ${ry - 10})`}>{children}</g>
    </>
  );
}

function ArcherTowerArt({ level }) {
  return (
    <TowerBase level={level}>
      <circle cx={CX} cy="-14" r="6" fill="#e8c99a" />
      <line x1={CX} y1="-8" x2={CX} y2="8" stroke="#3a2a18" strokeWidth="3" />
      <path d={`M ${CX - 12} -12 Q ${CX} -26 ${CX + 12} -12`} stroke="#5c4326" strokeWidth="2.4" fill="none" />
      <polygon points={`${CX - 14},-14 ${CX + 14},-14 ${CX},-38`} fill="#5f89c9" stroke="#274a7d" strokeWidth="1.2" />
    </TowerBase>
  );
}

function BallistaTowerArt({ level }) {
  return (
    <TowerBase level={level}>
      <rect x={CX - 20} y="-4" width="40" height="9" fill="#5c4326" />
      <line x1={CX - 26} y1="0" x2={CX + 26} y2="0" stroke="#241a10" strokeWidth="2.4" />
      <line x1={CX - 14} y1="-16" x2={CX + 14} y2="10" stroke="#8a5a2a" strokeWidth="3.2" strokeLinecap="round" />
      <line x1={CX + 14} y1="-16" x2={CX - 14} y2="10" stroke="#8a5a2a" strokeWidth="3.2" strokeLinecap="round" />
      <line x1={CX} y1="-10" x2={CX} y2="12" stroke="#c9995a" strokeWidth="2.6" />
    </TowerBase>
  );
}

function CatapultTowerArt({ level }) {
  return (
    <TowerBase level={level}>
      <rect x={CX - 18} y="-2" width="36" height="10" fill="#5c4326" />
      <circle cx={CX - 9} cy="3" r="4.4" fill="#241a10" />
      <circle cx={CX + 9} cy="3" r="4.4" fill="#241a10" />
      <line x1={CX - 9} y1="3" x2={CX + 16} y2="-24" stroke="#7c5a30" strokeWidth="4" strokeLinecap="round" />
      <circle cx={CX + 16} cy="-24" r="4.2" fill="#8f8a84" />
    </TowerBase>
  );
}

// ====== برج مراقبة - خشبي بسيط على أرجل، أرخص شكلًا (وأصغر) من الأبراج
// الحجرية التلاتة، بيرتفع شوية بس مع المستوى برضه. ======
function WatchTowerArt({ level }) {
  const legH = 46 + Math.min(level - 1, 10) * 2.4;
  const topY = BASE_Y - 8 - legH;
  return (
    <>
      <GroundShadow rx={36} />
      <line x1={CX - 16} y1={BASE_Y - 4} x2={CX - 10} y2={topY} stroke="#5c4326" strokeWidth="5" />
      <line x1={CX + 16} y1={BASE_Y - 4} x2={CX + 10} y2={topY} stroke="#5c4326" strokeWidth="5" />
      <line x1={CX - 12} y1={(BASE_Y + topY) / 2} x2={CX + 12} y2={(BASE_Y + topY) / 2} stroke="#7c5a30" strokeWidth="3.4" />
      <rect x={CX - 16} y={topY - 16} width="32" height="18" fill="#8a5a2a" stroke="#3a2a18" strokeWidth="1.6" />
      <polygon points={`${CX - 20},${topY - 16} ${CX + 20},${topY - 16} ${CX},${topY - 34}`} fill="#6e4a24" stroke="#3a2a18" strokeWidth="1.4" />
      <line x1={CX} y1={topY - 34} x2={CX} y2={topY - 46} stroke="#5c4326" strokeWidth="2" />
      <polygon points={`${CX},${topY - 46} ${CX + 12},${topY - 41} ${CX},${topY - 36}`} fill="#b3372c" />
    </>
  );
}

// ====== فخ - شكل منخفض ومموّه جزئيًا (شوكيات/حفرة) - مش شكل "مبنى"
// واضح عمدًا زي ما تصميم اللعبة يقتضي (الفخ المفروض يكون مفاجئ للمهاجم،
// عكس باقي القطع اللي المفروض تبقى واضحة/مهيبة بصريًا). ======
function TrapArt() {
  return (
    <>
      <GroundShadow rx={40} />
      <ellipse cx={CX} cy={BASE_Y - 10} rx="38" ry="16" fill="#241209" opacity="0.75" />
      <ellipse cx={CX} cy={BASE_Y - 12} rx="33" ry="13.5" fill="#120a05" opacity="0.85" />
      {[[-18, -8, 13], [0, -16, 17], [18, -8, 13], [-9, 2, 11], [9, 2, 11]].map(([dx, dy, h], i) => (
        <polygon
          key={i}
          points={`${CX + dx - 3},${BASE_Y + dy} ${CX + dx + 3},${BASE_Y + dy} ${CX + dx},${BASE_Y + dy - h}`}
          fill="#8a8f96"
          stroke="#3f3c39"
          strokeWidth="1"
        />
      ))}
    </>
  );
}

// ====== متراس - جذوع خشب مشحوذة متتالية على قاعدة عريضة ======
function BarricadeArt() {
  return (
    <>
      <GroundShadow rx={50} />
      <rect x={CX - 46} y={BASE_Y - 24} width="92" height="12" rx="2" fill="#5c4326" />
      {[-36, -18, 0, 18, 36].map((dx, i) => (
        <g key={i} transform={`translate(${CX + dx} ${BASE_Y - 24})`}>
          <polygon points="-6,0 6,0 0,-38" fill="#8a5a2a" stroke="#3a2a18" strokeWidth="1.3" />
          <polygon points="-2,-38 2,-38 0,-46" fill="#c9995a" />
        </g>
      ))}
    </>
  );
}

const REGISTRY = {
  wall: WallArt,
  gate: GateArt,
  archer_tower: ArcherTowerArt,
  ballista_tower: BallistaTowerArt,
  catapult_tower: CatapultTowerArt,
  watch_tower: WatchTowerArt,
  trap: TrapArt,
  barricade: BarricadeArt,
};

export function DefenseStructureSprite({ type, level = 1, destroyed = false, open = true, selected, width = 120, height = 190 }) {
  const reactId = useId();
  const Comp = REGISTRY[type] || WallArt;

  return (
    <svg
      viewBox="0 0 120 190"
      width={width}
      height={height}
      className={`pointer-events-none transition-transform duration-200 ${selected ? '-translate-y-1.5' : ''}`}
      style={{
        filter: destroyed
          ? 'grayscale(0.65) opacity(0.8)'
          : selected
          ? 'drop-shadow(0 0 12px rgba(255,214,102,.8)) drop-shadow(0 8px 10px rgba(0,0,0,.5))'
          : 'drop-shadow(0 8px 8px rgba(0,0,0,.4))',
      }}
      key={reactId}
    >
      {type === 'gate' ? (
        <Comp level={level} open={open} destroyed={destroyed} />
      ) : (
        <Comp level={level} destroyed={destroyed} />
      )}
      {selected && (
        <ellipse cx={CX} cy={BASE_Y + 3} rx="56" ry="15" fill="none" stroke="#ffd666" strokeWidth="2.5" opacity="0.9" />
      )}
    </svg>
  );
}

export default DefenseStructureSprite;
