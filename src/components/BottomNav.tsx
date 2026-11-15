import React from 'react';
import { NavLink } from 'react-router-dom';
import { KeyRound, Store, User, WalletCards } from 'lucide-react';

// Strictly 4 Tabs ONLY: Store, Orders, Add Balance, Profile
const NAV_ITEMS = [
  { to: '/', label: 'Store', icon: Store },
  { to: '/orders', label: 'Orders', icon: KeyRound },
  { to: '/add-balance', label: 'Add Balance', icon: WalletCards },
  { to: '/profile', label: 'Profile', icon: User },
];

export default function BottomNav() {
  return (
    <nav
      aria-label="Primary navigation"
      className="fixed bottom-0 left-0 right-0 z-40 h-14 border-t border-purple-500/25 bg-[#090b14]/95 backdrop-blur-xl"
    >
      <div className="mx-auto grid h-full max-w-2xl grid-cols-4 px-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'text-cyan-300 bg-purple-600/15'
                    : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`h-4 w-4 transition-transform ${
                      isActive ? 'scale-110 text-cyan-400' : ''
                    }`}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
