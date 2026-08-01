import { useState } from 'react';
import { LayoutDashboard, Users, Receipt, Coins, Megaphone } from 'lucide-react';
import AdminOverviewTab from './admin/AdminOverviewTab';
import AdminUsersTab from './admin/AdminUsersTab';
import AdminTransactionsTab from './admin/AdminTransactionsTab';
import AdminCoinPackagesTab from './admin/AdminCoinPackagesTab';
import AdminInboxTab from './admin/AdminInboxTab';

const TABS = [
  { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard, Component: AdminOverviewTab },
  { id: 'users', label: 'المستخدمين', icon: Users, Component: AdminUsersTab },
  { id: 'transactions', label: 'المعاملات', icon: Receipt, Component: AdminTransactionsTab },
  { id: 'coin-packages', label: 'باقات Coins', icon: Coins, Component: AdminCoinPackagesTab },
  { id: 'inbox', label: 'إعلانات', icon: Megaphone, Component: AdminInboxTab },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const Active = TABS.find((t) => t.id === activeTab)?.Component;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 font-display text-2xl font-extrabold text-bone">
        لوحة التحكم<span className="text-gold">.</span>
      </h1>

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-ink-600">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`focus-ring flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-gold text-gold'
                  : 'border-transparent text-bone/60 hover:text-bone'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {Active && <Active />}
    </div>
  );
}
