import { TILE_W, TILE_H, WORLD_W, WORLD_H, WORLD_CENTER_X, WORLD_CENTER_Y, BUILD_RADIUS, WORLD_RADIUS, VISION_RADIUS_SLOTS, SLOT_GRID_UNITS, CHUNK_SIZE, gridToWorld, mulberry32 } from './isoGrid';

// كثافة الديكورات (تراب/عشب/كلاسترات) بالنسبة لوحدة مساحة ثابتة - بدل ما
// نحسب عدد عناصر إجمالي للعالم كله (اللي كان محتاج نولّد العالم كله مرة
// واحدة عشان نعرف الكثافة الصح)، بنحسب "كام عنصر لكل بكسل مربع" مرة واحدة
// من نفس الأرقام الأصلية (2600x1760 هي القياس الأساسي)، وبعدين كل chunk
// بيولّد بس عدد العناصر اللي بتخصه هو (كثافة × مساحة الـ chunk) - النتيجة
// نفس الكثافة البصرية بالظبط، لكن من غير أي احتياج لحساب العالم كله مقدّمًا.
const BASE_AREA = 2600 * 1760;

const GRASS_BASE = ['#6f9a44', '#719c46', '#6a9440', '#75a04a', '#66914a'];
const GRASS_SHADE = ['#5e8838', '#63903c', '#588235'];
const DIRT_COLORS = ['#8a6a3f', '#7c5e38', '#93764a', '#7a5c34'];

// تدرّج لون الأرض الأساسي - كان قبل كده بيتملى مرة واحدة على مستطيل ثابت
// الحجم (WORLD_W×WORLD_H) لأن العالم كان محدود. دلوقتي العالم من غير حافة
// عملية، فأي chunk بعيد عن نقطة الأصل القديمة كان بيفضل من غير أي خلفية
// خالص (canvas شفاف = أسود) لأن المستطيل القديم مابيوصلوش. الحل: بنملى بس
// حدود الـ chunk الحالي (زي أي عنصر تاني بيترسم بالـ chunk)، والتدرّج نفسه
// (مركزه ونصف قطره) يفضلوا زي ما كانوا بالظبط - أي مسافة أبعد من آخر نقطة
// توقّف (0.85) بتاخد نفس اللون الأخير تلقائيًا (canvas gradients بتتجمّد على
// آخر لون بعد آخر stop)، فمفيش أي حافة أو قطع مفاجئ حتى في المسافات الكبيرة.
function drawGroundGradient(ctx, worldX0, worldY0) {
  const g = ctx.createRadialGradient(
    WORLD_W / 2, WORLD_H * 0.42, WORLD_H * 0.15,
    WORLD_W / 2, WORLD_H * 0.42, WORLD_H * 0.85
  );
  g.addColorStop(0, '#7fac52');
  g.addColorStop(0.55, '#6a9843');
  g.addColorStop(1, '#4d7530');
  ctx.fillStyle = g;
  ctx.fillRect(worldX0, worldY0, CHUNK_SIZE, CHUNK_SIZE);
}

// رقعة عشب واحدة: بقعة بيضاوية باهتة بتدي إحساس نسيج طبيعي بدل لون فلات واحد
function drawGrassTuft(ctx, x, y, r, color, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 0.5);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.fill();
  ctx.restore();
}

// بقعة تراب طبيعية (شكل غير منتظم بدل بيضاوي مثالي) - بتدي تنويع لطيف في لون
// الأرض هنا وهناك، إحساس "دروب مشية" أو تربة مكشوفة بدل عشب متجانس بالكامل.
//
// نسخة "بيانات فقط" - نفس الحساب بالظبط - بتستهلك الـ rand بنفس الترتيب
// بالظبط وترجع كل القيم الجاهزة (بدل ما ترسم فورًا)، عشان نقدر نولّد كل بقع
// التراب مرة واحدة بس، ونرسم كل واحدة بعدين وقت ما الـ chunk بتاعها يتحمّل.
function makeDirtPatchItem(x, y, r, rand) {
  const points = 7 + Math.floor(rand() * 3);
  const pts = [];
  for (let i = 0; i <= points; i++) {
    const ang = (i / points) * Math.PI * 2;
    const rr = r * (0.72 + rand() * 0.36);
    pts.push([ang, rr]);
  }
  const color = DIRT_COLORS[Math.floor(rand() * DIRT_COLORS.length)];
  const alpha = 0.18 + rand() * 0.14;
  return { x, y, pts, color, alpha };
}

function renderDirtPatch(ctx, item) {
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.scale(1, 0.5);
  ctx.beginPath();
  item.pts.forEach(([ang, rr], i) => {
    const px = Math.cos(ang) * rr;
    const py = Math.sin(ang) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fillStyle = item.color;
  ctx.globalAlpha = item.alpha;
  ctx.fill();
  ctx.restore();
}

// ظل ناعم متدرّج (بدل بقعة سوداء فلات) - متلاشي من المنتصف للحواف عشان يدي
// إحساس عمق أوضح للعناصر (شجر/صخور) بدل ظل مسطح حاد الحواف.
function drawSoftShadow(ctx, x, y, rx, ry) {
  ctx.save();
  const grad = ctx.createRadialGradient(x, y, 0, x, y, rx);
  grad.addColorStop(0, 'rgba(6,14,4,0.4)');
  grad.addColorStop(0.7, 'rgba(6,14,4,0.22)');
  grad.addColorStop(1, 'rgba(6,14,4,0)');
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
}

function drawTree(ctx, x, y, scale, rand) {
  const trunkH = 20 * scale;
  const trunkW = 6 * scale;
  drawSoftShadow(ctx, x, y + 3 * scale, 22 * scale, 9 * scale);
  // جذع
  ctx.fillStyle = '#5a3d1f';
  ctx.fillRect(x - trunkW / 2, y - trunkH, trunkW, trunkH);
  // طبقات ورق (3 دوائر متدرجة بتدي عمق)
  const layers = [
    { dy: -trunkH - 8 * scale, r: 22 * scale, color: '#2f6b2f' },
    { dy: -trunkH - 20 * scale, r: 18 * scale, color: '#3c8a3c' },
    { dy: -trunkH - 31 * scale, r: 13 * scale, color: '#4fa54f' },
  ];
  layers.forEach(({ dy, r, color }) => {
    const grad = ctx.createRadialGradient(x - r * 0.3, y + dy - r * 0.3, r * 0.1, x, y + dy, r);
    grad.addColorStop(0, color);
    grad.addColorStop(1, '#1f4d1f');
    ctx.beginPath();
    ctx.ellipse(x, y + dy, r, r * 0.82, 0, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  });
  void rand;
}

const ROCK_PARTS = [
  [-10, 0, 13],
  [8, -4, 15],
  [-2, 4, 10],
  [16, 2, 9],
];

// نسخة "بيانات فقط" - بتستهلك الـ rand مرة واحدة وقت التوليد (نفس عدد
// الاستدعاءات بالظبط اللي كانت جوه drawRockCluster الأصلية: نداء واحد لكل
// صخرة في الكلاستر) وترجّع قيم الـ "jag" الجاهزة عشان renderRockCluster
// يرسم بيها بعدين من غير ما يحتاج rand تاني.
function makeRockClusterItem(x, y, scale, rand) {
  const jags = ROCK_PARTS.map(() => 0.7 + rand() * 0.3);
  return { type: 'rock', x, y, scale, jags };
}

function renderRockCluster(ctx, { x, y, scale, jags }) {
  drawSoftShadow(ctx, x, y + 4 * scale, 24 * scale, 9 * scale);
  ROCK_PARTS.forEach(([dx, dy, r], i) => {
    const rr = r * scale;
    const cx = x + dx * scale;
    const cy = y + dy * scale;
    const grad = ctx.createLinearGradient(cx, cy - rr, cx, cy + rr);
    grad.addColorStop(0, '#a8a1ad');
    grad.addColorStop(1, '#6d6672');
    ctx.beginPath();
    const jag = jags[i];
    ctx.moveTo(cx - rr, cy);
    ctx.lineTo(cx - rr * 0.3 * jag, cy - rr * 0.95);
    ctx.lineTo(cx + rr * 0.4, cy - rr * 0.7);
    ctx.lineTo(cx + rr, cy + rr * 0.1);
    ctx.lineTo(cx + rr * 0.3, cy + rr * 0.6);
    ctx.lineTo(cx - rr * 0.4, cy + rr * 0.55);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,25,35,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
  });
}

// أرضية/قاعدة خفيفة تحت كل مبنى - قرص تراب مدكوك بيدي إحساس إن المبنى واقف
// على أرضية مجهزة بدل ما يبقى عايم فوق العشب مباشرة.
function drawBuildingPad(ctx, x, y, rx) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 0.5);
  ctx.beginPath();
  ctx.arc(0, 5, rx, 0, Math.PI * 2);
  ctx.fillStyle = '#7c6640';
  ctx.globalAlpha = 0.38;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 3, rx * 0.8, 0, Math.PI * 2);
  ctx.fillStyle = '#9c8455';
  ctx.globalAlpha = 0.5;
  ctx.fill();
  ctx.restore();
}

// أماكن المباني (نفس الإحداثيات اللي المباني متمركزة عليها في IsometricWorld.jsx)
// - محتاجينها هنا عشان نمنع الشجر/الصخور إنها تتزرع فوق مبنى، ونرسم تحتها
// قاعدة أرضية مناسبة لحجم كل مبنى.
const KEEP_OUT = [
  { gx: 0, gy: 0, r: 3.0, pad: 118 }, // القلعة الرئيسية
  { gx: 0, gy: 4.3, r: 2.1, pad: 82 }, // منجم الدهب
  { gx: 4.3, gy: 0, r: 2.1, pad: 82 }, // منشرة الخشب
  { gx: -4.3, gy: 0, r: 2.1, pad: 82 }, // محجر الحجر
];

function isKeptOut(gx, gy) {
  return KEEP_OUT.some(({ gx: kx, gy: ky, r }) => Math.hypot(gx - kx, gy - ky) < r);
}

// تحويل عكسي لـ gridToWorld - بياخد إحداثية بكسل حقيقية على لوحة العالم
// ويرجعها لإحداثية شبكة (gx, gy) متمركزة حوالين الصفر. مستخدم هنا بس (مش
// جزء من isoGrid العامة) عشان نعرف موقع أي نقطة عشوائية بالبكسل (تراب/عشب)
// بالنسبة للنهر أو المناطق الحيوية (biomes) اللي بتتحسب بإحداثيات الشبكة.
function worldToGrid(x, y) {
  const dx = x - WORLD_CENTER_X;
  const dy = y - WORLD_CENTER_Y;
  const a = dx / (TILE_W / 2); // gx - gy
  const b = dy / (TILE_H / 2); // gx + gy
  return { gx: (a + b) / 2, gy: (b - a) / 2 };
}

// ====== مناطق حيوية (Biomes) ======
// العالم البرّي حوالين القلعة مقسّم لـ 3 قطاعات زاويّة (غابة/جبال/سهول)
// بنسب متقاربة، بس بحدود متموّجة (مش خطوط مستقيمة زي تورتة) عشان تبان طبيعية
// - التموّج ده بيتعمل بإضافة اهتزاز جيبي (sine) بسيط على الزاوية نفسها قبل ما
// نحدد القطاع بتاعها، بدل ما نحسب حواف مستقيمة. القطاعات دي بصرية بحتة (بتأثر
// بس على شكل الديكور المرسوم)، ومبتغيرش أي حاجة في منطقة بناء القلعة نفسها.
function makeBiomeSectors(rand) {
  const order = ['forest', 'mountain', 'plains'];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    order,
    rotation: rand() * Math.PI * 2,
    seedPhase: rand() * Math.PI * 2,
  };
}

function warpedAngle(angle, seedPhase) {
  return angle + 0.22 * Math.sin(3 * angle + seedPhase) + 0.1 * Math.sin(7 * angle + seedPhase * 1.7);
}

function biomeAt(gx, gy, sectors) {
  if (gx === 0 && gy === 0) return 'plains';
  const angle = Math.atan2(gy, gx);
  const warped = warpedAngle(angle, sectors.seedPhase);
  const a = (((warped - sectors.rotation) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const idx = Math.min(2, Math.floor(a / ((Math.PI * 2) / 3)));
  return sectors.order[idx];
}

function biomeTintColor(type) {
  if (type === 'forest') return 'rgba(28,70,34,0.16)';
  if (type === 'mountain') return 'rgba(90,96,108,0.18)';
  return null; // سهول: مفيش تظليل إضافي فوق تدرّج الأرض الأساسي
}

// تظليل خفيف لكل قطاع حيوي فوق العشب (حلقة حوالين منطقة البناء) - بيترسم
// كـ"مروحة" من قطع صغيرة متتالية، كل قطعة لونها بيتحدد من نوع المنطقة عند
// زاويتها، عشان الحدود تبقى متموّجة زي ما biomeAt بيحسبها بالظبط.
function drawBiomeTintRing(ctx, sectors) {
  const segments = 160;
  const inner = BUILD_RADIUS + 0.5;
  const outer = WORLD_RADIUS;
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    const mid = (a0 + a1) / 2;
    const type = biomeAt(Math.cos(mid) * outer, Math.sin(mid) * outer, sectors);
    const color = biomeTintColor(type);
    if (!color) continue;
    const p0o = gridToWorld(Math.cos(a0) * outer, Math.sin(a0) * outer);
    const p1o = gridToWorld(Math.cos(a1) * outer, Math.sin(a1) * outer);
    const p1i = gridToWorld(Math.cos(a1) * inner, Math.sin(a1) * inner);
    const p0i = gridToWorld(Math.cos(a0) * inner, Math.sin(a0) * inner);
    ctx.beginPath();
    ctx.moveTo(p0o.x, p0o.y);
    ctx.lineTo(p1o.x, p1o.y);
    ctx.lineTo(p1i.x, p1i.y);
    ctx.lineTo(p0i.x, p0i.y);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }
}

function drawMountain(ctx, x, y, scale, rand) {
  const h = 60 * scale;
  drawSoftShadow(ctx, x, y + 4 * scale, 34 * scale, 12 * scale);
  const peaks = [
    { dx: -14 * scale, ph: h * 0.72, pw: 46 * scale * 0.62, color: '#7c8291', top: '#e7ecf2' },
    { dx: 10 * scale, ph: h, pw: 46 * scale * 0.8, color: '#5f6675', top: '#f4f7fa' },
  ];
  peaks.forEach(({ dx, ph, pw, color, top }) => {
    const cx = x + dx;
    const baseY = y;
    const peakY = y - ph;
    const leftX = cx - pw / 2;
    const rightX = cx + pw / 2;
    ctx.beginPath();
    ctx.moveTo(leftX, baseY);
    ctx.lineTo(cx - pw * 0.12, peakY + ph * 0.22);
    ctx.lineTo(cx, peakY);
    ctx.lineTo(cx + pw * 0.15, peakY + ph * 0.2);
    ctx.lineTo(rightX, baseY);
    ctx.closePath();
    const grad = ctx.createLinearGradient(cx, peakY, cx, baseY);
    grad.addColorStop(0, color);
    grad.addColorStop(1, '#3d4250');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,20,28,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // قمة ثلجية
    ctx.beginPath();
    ctx.moveTo(cx - pw * 0.22, peakY + ph * 0.3);
    ctx.lineTo(cx, peakY);
    ctx.lineTo(cx + pw * 0.24, peakY + ph * 0.28);
    ctx.lineTo(cx + pw * 0.08, peakY + ph * 0.34);
    ctx.lineTo(cx - pw * 0.06, peakY + ph * 0.3);
    ctx.closePath();
    ctx.fillStyle = top;
    ctx.globalAlpha = 0.92;
    ctx.fill();
    ctx.globalAlpha = 1;
  });
  void rand;
}

// ====== نهر ======
// النهر ماشي في قوس (نصف قطره الأساسي أكبر من BUILD_RADIUS+3 دايمًا) حوالين
// منطقة البناء - أول ضمانة إن النهر منقدرش يعدي فوق شبكة القلعة أو أي مبنى
// هي إن نصف قطره الأدنى أكبر من نطاق البناء بمسافة كافية. الاهتزاز الجيبي
// (wob1/wob2) بيدي شكل متعرّج طبيعي بدل قوس دائرة مثالي.
function makeRiver(rand) {
  const angleStart = rand() * Math.PI * 2;
  const angleSpan = (0.75 + rand() * 0.5) * Math.PI; // ~135°..225°
  const baseRadius = BUILD_RADIUS + 3 + rand() * 2;
  const maxWobble = Math.min(2.2, (WORLD_RADIUS - baseRadius) * 0.35);
  return {
    angleStart,
    angleSpan,
    baseRadius,
    wob1: maxWobble * (0.5 + rand() * 0.5),
    k1: 2 + rand() * 2,
    phase1: rand() * Math.PI * 2,
    wob2: maxWobble * 0.4,
    k2: 5 + rand() * 3,
    phase2: rand() * Math.PI * 2,
    halfWidthUnits: 0.55 + rand() * 0.25,
  };
}

function riverRadiusAt(angle, river) {
  return (
    river.baseRadius +
    river.wob1 * Math.sin(river.k1 * angle + river.phase1) +
    river.wob2 * Math.sin(river.k2 * angle + river.phase2)
  );
}

// المسافة الزاوية (0..angleSpan) لنقطة داخل مدى قوس النهر، أو null لو برّه المدى
function riverRelAngle(angle, river) {
  const rel = (((angle - river.angleStart) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  return rel <= river.angleSpan ? rel : null;
}

// تلاشي عرض النهر لصفر قرب طرفيه (بداية ونهاية القوس) بدل قطع مفاجئ
function riverWidthFactor(rel, river) {
  const edge = river.angleSpan * 0.12;
  if (rel < edge) return rel / edge;
  if (rel > river.angleSpan - edge) return (river.angleSpan - rel) / edge;
  return 1;
}

function isNearRiver(gx, gy, river, margin = 0) {
  const angle = Math.atan2(gy, gx);
  const rel = riverRelAngle(angle, river);
  if (rel === null) return false;
  const wf = riverWidthFactor(rel, river);
  if (wf <= 0) return false;
  const r = Math.hypot(gx, gy);
  const expected = riverRadiusAt(angle, river);
  return Math.abs(r - expected) <= river.halfWidthUnits * wf + margin;
}

// بيترسم كـ"شريط" (مضلع بحافتين) بدل خط بعرض ثابت، عشان يقدر يتلاشى في عرضه
// قرب الأطراف ويدّي إحساس ضفة/مية بدل خط واحد فلات.
function drawRiver(ctx, river) {
  const steps = 90;
  const outerPts = [];
  const innerPts = [];
  const bankOuterPts = [];
  const bankInnerPts = [];
  for (let i = 0; i <= steps; i++) {
    const rel = (i / steps) * river.angleSpan;
    const angle = river.angleStart + rel;
    const baseR = riverRadiusAt(angle, river);
    const wf = riverWidthFactor(rel, river);
    const hw = river.halfWidthUnits * wf;
    const bankExtra = 0.35 * wf;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    outerPts.push(gridToWorld((baseR + hw) * cosA, (baseR + hw) * sinA));
    innerPts.push(gridToWorld((baseR - hw) * cosA, (baseR - hw) * sinA));
    bankOuterPts.push(gridToWorld((baseR + hw + bankExtra) * cosA, (baseR + hw + bankExtra) * sinA));
    bankInnerPts.push(gridToWorld((baseR - hw - bankExtra) * cosA, (baseR - hw - bankExtra) * sinA));
  }

  const buildRibbon = (outer, inner) => {
    ctx.beginPath();
    outer.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    for (let i = inner.length - 1; i >= 0; i--) ctx.lineTo(inner[i].x, inner[i].y);
    ctx.closePath();
  };

  // ضفة رملية أعرض من مجرى المية نفسه
  buildRibbon(bankOuterPts, bankInnerPts);
  ctx.fillStyle = '#c9b284';
  ctx.globalAlpha = 0.85;
  ctx.fill();

  // مجرى المية
  buildRibbon(outerPts, innerPts);
  const grad = ctx.createLinearGradient(outerPts[0].x, outerPts[0].y, outerPts[outerPts.length - 1].x, outerPts[outerPts.length - 1].y);
  grad.addColorStop(0, '#3f7fa8');
  grad.addColorStop(0.5, '#4f96bd');
  grad.addColorStop(1, '#3f7fa8');
  ctx.fillStyle = grad;
  ctx.globalAlpha = 0.92;
  ctx.fill();
  ctx.globalAlpha = 1;
}

// ====== توليد "كلاسترات" طبيعية للديكور (شجر/صخور/جبال) بدل توزيع عشوائي
// بحت لكل خانة. بدل ما نلف على كل خانة في الشبكة ونحط عنصر باحتمال مستقل
// (اللي بيطلع شكل "مرشوش" عشوائي)، بنختار مراكز كلاسترات متفرقة، وكل كلاستر
// بيحط حواليه عدد عناصر بنفس النوع الغالب - النوع الغالب لكل كلاستر بيتحدد
// من المنطقة الحيوية (biome) اللي مركز الكلاستر واقع فيها: غابة كثيفة في
// قطاع الغابة، سلسلة جبال في قطاع الجبال، وخليط خفيف (شجر وصخور) في السهول.
//
// ====== نسخة "لكل chunk لوحده" (بدل توليد العالم كله مرة واحدة) ======
// بتاخد بس مربع الـ chunk نفسه (left/top + CHUNK_SIZE) وتحاول تحط مراكز
// كلاسترات جواه بس - العدد بيتحسب من كثافة العالم الأصلية × مساحة الـ chunk،
// مش من مساحة العالم كله، فمفيش أي احتياج نلف على العالم كله عشان نولّد
// chunk واحد. أعضاء الكلاستر ممكن يقعوا برّه حدود الـ chunk شوية (حسب
// clusterSpread) - ده طبيعي ومقصود: بيتلقطوا بعدين من خلال فحص التداخل مع
// الهامش (DECOR_MARGIN) وقت الرسم، بالظبط زي أي عنصر تاني قريب من حافة.
function generateDecorItemsForChunk(rand, sectors, river, left, top) {
  const items = [];
  const attempts = expectedCount(DECOR_ATTEMPT_DENSITY, rand);
  for (let i = 0; i < attempts; i++) {
    const x = left + rand() * CHUNK_SIZE;
    const y = top + rand() * CHUNK_SIZE;
    const { gx, gy } = worldToGrid(x, y);
    const distFromCenter = Math.max(Math.abs(gx), Math.abs(gy));
    if (isKeptOut(gx, gy)) continue;
    if (isNearRiver(gx, gy, river, 0.4)) continue;

    const biome = biomeAt(gx, gy, sectors);
    // wildness بتتلاشى تدريجيًا وبتوصل لسقف 1 وتفضل عليه - مش بتعتمد على
    // WORLD_RADIUS كحافة قصوى للعالم (WORLD_RADIUS بقى بس نصف قطر مرجعي
    // لحلقة التظليل والنهر قرب القلعة). العالم دلوقتي من غير حافة عملية،
    // فالكثافة لازم تفضل مستقرة لأي مسافة، مهما بعدنا عن القلعة.
    const wildness = Math.min(1, Math.max(0, (distFromCenter - BUILD_RADIUS * 0.4) / (WORLD_RADIUS - BUILD_RADIUS * 0.4)));
    let spawnChance = 0.16 + wildness * 0.5;
    if (biome === 'forest') spawnChance = Math.min(0.95, spawnChance + 0.25);
    else if (biome === 'mountain') spawnChance = Math.min(0.85, spawnChance + 0.12);
    if (rand() > spawnChance) continue;

    let dominantType;
    if (biome === 'forest') dominantType = rand() < 0.9 ? 'tree' : 'rock';
    else if (biome === 'mountain') dominantType = rand() < 0.75 ? 'mountain' : 'rock';
    else dominantType = rand() > 0.42 ? 'tree' : 'rock';

    const memberCount =
      biome === 'forest' ? 4 + Math.floor(rand() * 5) : biome === 'mountain' ? 2 + Math.floor(rand() * 3) : 3 + Math.floor(rand() * 4);
    const clusterSpread = biome === 'mountain' ? 0.9 + rand() * 0.7 : 0.55 + rand() * 0.5;

    for (let m = 0; m < memberCount; m++) {
      const mgx = gx + (rand() - 0.5) * 2 * clusterSpread;
      const mgy = gy + (rand() - 0.5) * 2 * clusterSpread;
      if (isKeptOut(mgx, mgy)) continue;
      if (isNearRiver(mgx, mgy, river, 0.15)) continue;
      const { x, y } = gridToWorld(mgx, mgy);
      const scale = 0.8 + rand() * 0.6;

      let memberType = dominantType;
      if (rand() >= 0.82) {
        const alts = biome === 'forest' ? ['rock', 'tree'] : biome === 'mountain' ? ['rock', 'mountain'] : ['tree', 'rock'];
        memberType = alts[Math.floor(rand() * alts.length)];
      }
      if (memberType === 'tree') {
        items.push({ type: 'tree', x, y, scale });
      } else if (memberType === 'mountain') {
        items.push({ type: 'mountain', x, y, scale: biome === 'mountain' ? scale * 1.6 + 0.4 : scale });
      } else {
        items.push(makeRockClusterItem(x, y, scale, rand));
      }
    }
  }
  return items;
}

function renderDecorItem(ctx, item) {
  if (item.type === 'tree') drawTree(ctx, item.x, item.y, item.scale);
  else if (item.type === 'mountain') drawMountain(ctx, item.x, item.y, item.scale);
  else renderRockCluster(ctx, item);
}

const DIRT_MARGIN = 130;
const GRASS_MARGIN = 60;
const DECOR_MARGIN = 220;

// كثافة كل نوع عنصر لكل بكسل مربع - نفس نسبة الأرقام الأصلية (42 بقعة تراب/
// 1400 عشبة/110 محاولة كلاستر على مساحة 2600x1760) لكن معبّر عنها كـ"كثافة"
// عشان أي مساحة (chunk واحد بدل العالم كله) تقدر تحسب نصيبها منها لوحدها.
const DIRT_DENSITY = 42 / BASE_AREA;
const GRASS_DENSITY = 1400 / BASE_AREA;
const DECOR_ATTEMPT_DENSITY = 110 / BASE_AREA;

const WORLD_SEED = 20260715;

// ====== وصف العالم العام (Biomes + River) ======
// دول "شكل" العالم العام - قطاعات حيوية ومسار نهر - مش عناصر مكرّرة زي
// الشجر/الصخور، فرخام يتحسبوا مرة واحدة بس (أرقام قليلة، مش لفة على كل
// خانة في العالم) ونحتفظ بيهم في متغيّر واحد بسيط. أي chunk محتاج يعرف
// البيوم/النهر عشان يحدد شكل الديكور اللي بيولّده هو بيرجع لنفس الوصف ده.
let worldDescriptor = null;

function getWorldDescriptor() {
  if (!worldDescriptor) {
    const rand = mulberry32(WORLD_SEED);
    worldDescriptor = { sectors: makeBiomeSectors(rand), river: makeRiver(rand) };
  }
  return worldDescriptor;
}

// بذرة عشوائية مستقلة لكل chunk - نفس الـ chunk (cx,cy) بيرجّع نفس البذرة
// دايمًا (بذرة العالم + إحداثيات الـ chunk نفسها)، فالمولّد بتاعه بيفضل ثابت
// بين كل تحميل/تفريغ (unload/reload) من غير ما نحتاج نخزّن أي حاجة دايمة.
function chunkSeed(cx, cy) {
  let h = Math.imul(WORLD_SEED ^ (cx + 0x1000000), 0x27d4eb2f);
  h = Math.imul(h ^ (cy + 0x1000000), 0x85ebca6b);
  h ^= h >>> 15;
  return h >>> 0;
}

// عدد عناصر متوقّع (كثافة × مساحة) بتقريب احتمالي بدل تقريب ثابت (Math.round)
// - بيستهلك نداء rand() واحد عشان الكسر (0.4 مثلًا) يترجم لعنصر إضافي 40% من
// المرات بدل ما يختفي أو يتقرّب لفوق كل مرة بنفس الطريقة.
function expectedCount(density, rand) {
  const expected = density * CHUNK_SIZE * CHUNK_SIZE;
  const base = Math.floor(expected);
  return rand() < expected - base ? base + 1 : base;
}

function chunkBounds(cx, cy) {
  const left = cx * CHUNK_SIZE;
  const top = cy * CHUNK_SIZE;
  return { left, top, right: left + CHUNK_SIZE, bottom: top + CHUNK_SIZE };
}

// ====== توليد أرض الـ chunk (Chunk Loading + توليد إجرائي لكل chunk) ======
// كل chunk بيولّد عناصره هو بس (تراب/عشب/كلاسترات ديكور) من مولّد عشوائي
// مبذور بإحداثياته هو (chunkSeed) - من غير ما نحتاج نمرّ على العالم كله ولا
// حتى نعرف بعناصر أي chunk تاني. النتيجة بتتخزّن في cache بسيط عشان لو نفس
// الـ chunk اتفك تحميله وبعدين رجع تاني (اللاعب رجّع الكاميرا) مايتحسبش تاني.
const chunkItemCache = new Map();

function generateChunkOwnItems(cx, cy) {
  const key = `${cx},${cy}`;
  const cached = chunkItemCache.get(key);
  if (cached) return cached;

  const { sectors, river } = getWorldDescriptor();
  const rand = mulberry32(chunkSeed(cx, cy));
  const { left, top } = chunkBounds(cx, cy);

  const dirt = [];
  const dirtCount = expectedCount(DIRT_DENSITY, rand);
  for (let i = 0; i < dirtCount; i++) {
    const x = left + rand() * CHUNK_SIZE;
    const y = top + rand() * CHUNK_SIZE;
    const { gx, gy } = worldToGrid(x, y);
    if (isNearRiver(gx, gy, river, 0.5)) continue;
    const r = 40 + rand() * 70;
    dirt.push(makeDirtPatchItem(x, y, r, rand));
  }

  const grass = [];
  const grassCount = expectedCount(GRASS_DENSITY, rand);
  for (let i = 0; i < grassCount; i++) {
    const x = left + rand() * CHUNK_SIZE;
    const y = top + rand() * CHUNK_SIZE;
    const { gx, gy } = worldToGrid(x, y);
    if (isNearRiver(gx, gy, river, 0.25)) continue;
    const r = 14 + rand() * 30;
    const palette = rand() > 0.5 ? GRASS_BASE : GRASS_SHADE;
    const color = palette[Math.floor(rand() * palette.length)];
    const alpha = 0.22 + rand() * 0.22;
    grass.push({ x, y, r, color, alpha });
  }

  const decor = generateDecorItemsForChunk(rand, sectors, river, left, top);

  const result = { dirt, grass, decor };
  chunkItemCache.set(key, result);
  return result;
}

function withinMargin(item, bounds, margin) {
  return (
    item.x >= bounds.left - margin &&
    item.x <= bounds.right + margin &&
    item.y >= bounds.top - margin &&
    item.y <= bounds.bottom + margin
  );
}

// عشان أي عنصر مولّد قريب من حافة الـ chunk بتاعه (أو كلاستر ديكور امتدت
// أعضاؤه شوية برّه حدوده) يترسم كامل من غير قطع، بنولّد كمان الـ 8 جيران
// (كل واحد فيهم بيولّد بنفس الطريقة - من بذرته هو بس)، ونفلتر بس العناصر
// اللي فعلًا بتتقاطع مع مربع الـ chunk المطلوب رسمه (+ هامش أمان). كل عنصر
// اتولّد مرة واحدة بس (في الـ chunk اللي "بيملكه")، فمفيش ازدواج/كثافة زيادة
// في مناطق التداخل - بس ممكن يترسم في أكتر من canvas.
function collectChunkRenderItems(cx, cy) {
  const bounds = chunkBounds(cx, cy);
  const dirt = [];
  const grass = [];
  const decor = [];
  for (let dcx = -1; dcx <= 1; dcx++) {
    for (let dcy = -1; dcy <= 1; dcy++) {
      const ncx = cx + dcx;
      const ncy = cy + dcy;
      const own = generateChunkOwnItems(ncx, ncy);
      own.dirt.forEach((item) => { if (withinMargin(item, bounds, DIRT_MARGIN)) dirt.push(item); });
      own.grass.forEach((item) => { if (withinMargin(item, bounds, GRASS_MARGIN)) grass.push(item); });
      own.decor.forEach((item) => { if (withinMargin(item, bounds, DECOR_MARGIN)) decor.push(item); });
    }
  }
  return { dirt, grass, decor };
}

// ====== باكينج شنك واحد بس من الأرض (Chunk Loading) ======
// بيرسم مربع واحد بحجم CHUNK_SIZE من الأرض (تدرّج اللون + تظليل المنطقة
// الحيوية + النهر - رخام ثابت التكلفة بيترسم في كل شنك - وبعد كده العناصر
// (تراب/عشب/ديكور) اللي اتولّدت إجرائيًا للشنك ده وجيرانه المباشرين). ده اللي
// بيوفّر الذاكرة والوقت بدل ما نباك كانفاس واحد بحجم العالم كله دايمًا، وبدل
// ما نحتاج نولّد/نخزّن عناصر العالم كله مقدّمًا عشان نعرف نبدأ أول شنك.
export function bakeTerrainChunk(canvas, cx, cy, dpr = 1) {
  const { sectors, river } = getWorldDescriptor();
  const worldX0 = cx * CHUNK_SIZE;
  const worldY0 = cy * CHUNK_SIZE;

  canvas.width = Math.round(CHUNK_SIZE * dpr);
  canvas.height = Math.round(CHUNK_SIZE * dpr);
  canvas.style.width = `${CHUNK_SIZE}px`;
  canvas.style.height = `${CHUNK_SIZE}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.translate(-worldX0, -worldY0);

  const { dirt, grass, decor } = collectChunkRenderItems(cx, cy);

  drawGroundGradient(ctx, worldX0, worldY0);
  drawBiomeTintRing(ctx, sectors);

  dirt.forEach((item) => renderDirtPatch(ctx, item));

  drawRiver(ctx, river);

  grass.forEach((item) => drawGrassTuft(ctx, item.x, item.y, item.r, item.color, item.alpha));

  // قاعدة أرضية تحت كل مبنى (عناصر قليلة جدًا - رخيصة تترسم في أي شنك بتتقاطع معاه)
  KEEP_OUT.forEach(({ gx, gy, pad }) => {
    const { x, y } = gridToWorld(gx, gy);
    if (Math.abs(x - (worldX0 + CHUNK_SIZE / 2)) > CHUNK_SIZE / 2 + pad) return;
    if (Math.abs(y - (worldY0 + CHUNK_SIZE / 2)) > CHUNK_SIZE / 2 + pad) return;
    drawBuildingPad(ctx, x, y, pad);
  });

  decor.forEach((item) => renderDecorItem(ctx, item));

  return ctx;
}

// ====== ضباب الحرب (Fog of War) - استكشاف حقيقي ======
// الفكرة القديمة كانت "فتحة" واحدة ثابتة حوالين قلعة اللاعب في مركز العالم
// (0,0) بترتسم مرة واحدة بس وماتتحركش أبدًا - يعني دايرة رؤية جامدة. دلوقتي
// الضباب بقى استكشاف حقيقي:
//   - أي جزء من العالم اتشاف قبل كده (دخل نطاق الرؤية مرة، أي وقت) بيتسجّل في
//     exploredChunks وبيفضل مكشوف "للأبد" - حتى لو الكاميرا بعدت عنه تاني، مفيش
//     أي إعادة تغطية بالضباب لجزء اتكشف قبل كده.
//   - نطاق الرؤية الكامل (الإضاءة الكاملة/بدون أي تظليل) بيفضل بس حوالين مكان
//     الكاميرا الحالي - نفس نصف قطر الرؤية القديم (BUILD_RADIUS +
//     VISION_RADIUS_SLOTS*SLOT_GRID_UNITS من الباك إند)، بس دلوقتي بيتبع مركز
//     الفيوبورت الحالي بدل ما يفضل ثابت في نقطة واحدة.
//   - أي جزء لسه ماتشافش خالص لسه متغطي بضباب أسود كامل.
// التسجيل نفسه (مين اتكشف) بيتخزّن بحبيبة الـ chunk (نفس تقسيمة أرضية العالم)
// عشان يتماشى تمامًا مع دورة تحميل/تفريغ الـ chunks - مش محتاجين نخزّن بيانات
// لكل بكسل. القرار ده عرض بصري بحت برضه (زي الضباب القديم بالظبط) - مفيش أي
// تأثير على بيانات اللعب (القلاع القريبة لسه بتيجي من الباك إند بنفس الفلترة).
const EXPLORED_STORAGE_KEY = 'worldmap_fow_explored_v1';

// مجموعة الـ chunks المستكشفة - مصدر الحقيقة الوحيد لهذا الجلسة، وبيتحمّل من
// localStorage أول مرة يتلمس فيها (lazy) عشان الاستكشاف يفضل "للأبد" حتى بعد
// إعادة تحميل الصفحة، مش بس طول ما التطبيق فاتح.
const exploredChunks = new Set();
let exploredLoadedFromStorage = false;

function ensureExploredLoaded() {
  if (exploredLoadedFromStorage) return;
  exploredLoadedFromStorage = true;
  try {
    const raw = localStorage.getItem(EXPLORED_STORAGE_KEY);
    if (raw) JSON.parse(raw).forEach((key) => exploredChunks.add(key));
  } catch {
    // localStorage مش متاح (وضع خاص، أو حصة التخزين خلصت) - نكمّل بالمجموعة
    // اللي في الذاكرة بس، الاستكشاف لسه هيفضل "للأبد" طول ما الصفحة فاتحة.
  }
}

let persistTimer = null;
function schedulePersistExplored() {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      localStorage.setItem(EXPLORED_STORAGE_KEY, JSON.stringify([...exploredChunks]));
    } catch {
      // نفس ملاحظة القراءة - لو التخزين فشل، الاستكشاف يفضل شغال للجلسة
      // الحالية بس من غير ما يعطل أي حاجة تانية.
    }
  }, 400);
}

// هل الـ chunk ده اتشاف قبل كده (أي وقت)؟ - لو آه، يفضل مكشوف للأبد.
export function isChunkExplored(cx, cy) {
  ensureExploredLoaded();
  return exploredChunks.has(`${cx},${cy}`);
}

// بيسجّل إن الـ chunk ده اتشاف - عملية "للأبد" (مفيش دالة عكسية تشيله من
// المجموعة). بترجع true لو ده أول مرة يتسجّل فيها (استكشاف جديد فعلاً) عشان
// المكوّن اللي بيستدعيها يعرف يعمل re-render لو محتاج.
export function markChunkExplored(cx, cy) {
  ensureExploredLoaded();
  const key = `${cx},${cy}`;
  if (exploredChunks.has(key)) return false;
  exploredChunks.add(key);
  schedulePersistExplored();
  return true;
}

// نصف قطر نطاق الرؤية الكامل (نفس المسافة اللي كانت بتترسم بيها الفتحة
// القديمة) - بيرجع inner/outer بوحدات بكسل "قبل" تطبيق تحويل البعد الإيزومتري
// (TILE_H/TILE_W) اللي بيتطبق وقت الرسم/حساب المسافة عشان الفتحة تبقى بيضاوية
// متماشية مع باقي الخريطة بدل دايرة كاملة الاستدارة.
export function getVisionRadiusInfo() {
  const revealUnits = BUILD_RADIUS + VISION_RADIUS_SLOTS * SLOT_GRID_UNITS;
  const innerUnits = revealUnits * 0.72; // بداية التلاشي الناعم لحافة الرؤية
  const { x: outerX, y: outerY } = gridToWorld(revealUnits, 0);
  const outerR = Math.hypot(outerX - WORLD_CENTER_X, outerY - WORLD_CENTER_Y);
  const innerR = outerR * (innerUnits / revealUnits);
  return { innerR, outerR };
}

// مركز نطاق الرؤية الحالي (بإحداثيات بكسل حقيقية على لوحة العالم) - دلوقتي
// بيتبع منتصف الفيوبورت الظاهر فعليًا على الشاشة (مكان الكاميرا)، مش نقطة
// ثابتة زي قبل. ده اللي بيخلي "الاستكشاف" حقيقي: أي مكان تسحب له الكاميرا
// وتوقّف فيه بيبقى جوه نطاق الرؤية وبيتسجّل مكشوف.
export function getVisionCenter({ x, y, scale, viewportWidth, viewportHeight }) {
  return {
    x: (-x + viewportWidth / 2) / scale,
    y: (-y + viewportHeight / 2) / scale,
  };
}

// هل مربع الـ chunk ده بيتقاطع مع دايرة (بيضاوية) نطاق الرؤية الحالي؟ -
// بنحسب أقرب نقطة من مربع الـ chunk لمركز الرؤية، وبعدين نحول فرق المسافة
// لنفس "الفضاء" المتحول بيه شكل الفتحة (y مقسومة على TILE_H/TILE_W) قبل
// المقارنة بـ outerR. الدالة دي بتستخدم في حالتين: (1) تحديد أي chunk لسه ما
// اتسجّلش استكشاف يستاهل يتسجّل دلوقتي، و(2) تحديد أي chunk مستكشف قبل كده
// واقع دلوقتي جوه نطاق الرؤية (إضاءة كاملة) ولا برّه (مستكشف لكن مش الوقت ده).
export function chunkOverlapsVision(cx, cy, visionCenter, outerR) {
  const left = cx * CHUNK_SIZE;
  const top = cy * CHUNK_SIZE;
  const right = left + CHUNK_SIZE;
  const bottom = top + CHUNK_SIZE;
  const nx = Math.max(left, Math.min(visionCenter.x, right));
  const ny = Math.max(top, Math.min(visionCenter.y, bottom));
  const dx = nx - visionCenter.x;
  const dy = (ny - visionCenter.y) / (TILE_H / TILE_W);
  return Math.hypot(dx, dy) <= outerR;
}

// ====== باكينج شنك واحد بس من الضباب ======
// بيرسم مربع واحد بحجم CHUNK_SIZE أسود شبه معتم بالكامل، وبعدين (لو drawHole
// = true) بيحاول يمسح فتحة بيضاوية ناعمة الحواف حوالين مركز الرؤية الحالي -
// بالظبط زي drawFogOfWar القديمة، بس مركزها بقى متغيّر (visionX/visionY) مش
// ثابت في مركز العالم. للـ chunks البعيدة عن مركز الرؤية، الفتحة أصلًا
// مابتوصلش لحدودها فبيفضل الملء الأسود زي ما هو - يعني نفس النتيجة البصرية
// من غير أي حساب إضافي حقيقي.
export function bakeFogChunk(canvas, cx, cy, dpr, visionX, visionY, drawHole = true) {
  const worldX0 = cx * CHUNK_SIZE;
  const worldY0 = cy * CHUNK_SIZE;

  canvas.width = Math.round(CHUNK_SIZE * dpr);
  canvas.height = Math.round(CHUNK_SIZE * dpr);
  canvas.style.width = `${CHUNK_SIZE}px`;
  canvas.style.height = `${CHUNK_SIZE}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, CHUNK_SIZE, CHUNK_SIZE);
  ctx.translate(-worldX0, -worldY0);

  ctx.fillStyle = 'rgba(4,6,10,0.93)';
  ctx.fillRect(worldX0, worldY0, CHUNK_SIZE, CHUNK_SIZE);

  if (!drawHole) return ctx;

  const { innerR, outerR } = getVisionRadiusInfo();
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.translate(visionX, visionY);
  ctx.scale(1, TILE_H / TILE_W);
  const g = ctx.createRadialGradient(0, 0, innerR, 0, 0, outerR);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.arc(0, 0, outerR, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  return ctx;
}

export { TILE_W, TILE_H };