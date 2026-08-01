import { Coins, TreePine, Mountain } from 'lucide-react';

// ====== ميتاداتا الموارد المشتركة ======
// أي مكان في الفرونت إند بيعرض دهب/خشب/حجر (شريط الموارد، بانل المبنى،
// كروت البناء...) بيستورد من هنا عشان الأيقونة/الاسم/اللون يفضلوا متطابقين
// في كل مكان من غير ما نكررهم.
export const RESOURCE_META = {
  gold: { label: 'دهب', icon: Coins, color: '#eab130' },
  wood: { label: 'خشب', icon: TreePine, color: '#4ade80' },
  stone: { label: 'حجر', icon: Mountain, color: '#94a3b8' },
};

export const RESOURCE_ORDER = Object.keys(RESOURCE_META);
