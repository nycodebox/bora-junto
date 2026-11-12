import React from 'react';
import { Bell, ChevronLeft, Home, MapPin, ShieldCheck, User, Users } from 'lucide-react';
import { ScreenId } from '../types';

interface StatusBarProps {
  time?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ time = '22:15' }) => {
  return (
    <div className="flex items-center justify-between px-6 pt-3 pb-1 select-none text-[#102536] dark:text-white shrink-0">
      <span className="text-[15px] font-semibold tracking-[-0.02em] tabular-nums">
        {time}
      </span>
      <div className="flex items-center gap-[6px]">
        {/* Signal bars */}
        <svg width="17" height="12" viewBox="0 0 17 12" fill="none" aria-hidden="true">
          <rect x="0.5" y="7.5" width="2.6" height="4" rx="0.8" fill="currentColor" />
          <rect x="4.5" y="5.5" width="2.6" height="6" rx="0.8" fill="currentColor" />
          <rect x="8.5" y="3" width="2.6" height="8.5" rx="0.8" fill="currentColor" />
          <rect x="12.5" y="0.5" width="2.6" height="11" rx="0.8" fill="currentColor" />
        </svg>
        {/* Wi-Fi */}
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden="true">
          <path
            d="M8 9.6a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3Zm-3.1-1.9a4.4 4.4 0 0 1 6.2 0 .75.75 0 0 1-1.06 1.06 2.9 2.9 0 0 0-4.08 0A.75.75 0 0 1 4.9 7.7Zm-2.55-2.55a8 8 0 0 1 11.3 0 .75.75 0 1 1-1.06 1.06 6.5 6.5 0 0 0-9.18 0 .75.75 0 0 1-1.06-1.06ZM.35 2.6a11.3 11.3 0 0 1 15.3 0 .75.75 0 1 1-1.04 1.08 9.8 9.8 0 0 0-13.22 0A.75.75 0 0 1 .35 2.6Z"
            fill="currentColor"
          />
        </svg>
        {/* Battery */}
        <svg width="26" height="13" viewBox="0 0 26 13" fill="none" aria-hidden="true">
          <rect
            x="0.75"
            y="1"
            width="21.5"
            height="11"
            rx="3.2"
            stroke="currentColor"
            strokeOpacity="0.45"
            strokeWidth="1.2"
          />
          <rect x="2.4" y="2.6" width="18.2" height="7.8" rx="1.8" fill="currentColor" />
          <path
            d="M23.5 4.6v3.8a1.4 1.4 0 0 0 1.2-1.9 1.4 1.4 0 0 0-1.2-1.9Z"
            fill="currentColor"
            fillOpacity="0.55"
          />
        </svg>
      </div>
    </div>
  );
};

export const HomeIndicator: React.FC = () => (
  <div className="flex justify-center pt-2 pb-[8px] shrink-0">
    <div className="w-[134px] h-[5px] rounded-full bg-[#102536] dark:bg-white" />
  </div>
);

interface BrandHeaderProps {
  rightIcon: 'shield' | 'bell';
  onRightClick?: () => void;
}

export const BrandHeader: React.FC<BrandHeaderProps> = ({ rightIcon, onRightClick }) => {
  return (
    <div className="flex items-center justify-between px-6 pt-3 pb-2 shrink-0">
      <img
        src="/assets/brand/borajunto-wordmark.png"
        alt="BoraJunto"
        className="h-[34px] w-auto object-contain select-none"
      />
      <button
        type="button"
        onClick={onRightClick}
        aria-label={rightIcon === 'shield' ? 'Verificação acadêmica' : 'Notificações'}
        className="w-10 h-10 -mr-2 flex items-center justify-center rounded-full transition-opacity hover:opacity-75 cursor-pointer"
      >
        {rightIcon === 'shield' ? (
          <ShieldCheck className="w-[22px] h-[22px] text-[#E11D60] dark:text-[#F43F7A]" strokeWidth={1.9} />
        ) : (
          <Bell className="w-[22px] h-[22px] text-[#102536] dark:text-white" strokeWidth={1.9} />
        )}
      </button>
    </div>
  );
};

interface FlowHeaderProps {
  title: string;
  onBack: () => void;
}

export const FlowHeader: React.FC<FlowHeaderProps> = ({ title, onBack }) => {
  return (
    <div className="flex items-center justify-between px-6 pt-3 pb-3 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar"
          className="w-8 h-8 -ml-2 flex items-center justify-center rounded-full text-[#102536] dark:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
        >
          <ChevronLeft className="w-6 h-6" strokeWidth={2.2} />
        </button>
        <h1 className="text-[22px] font-bold tracking-[-0.02em] text-[#102536] dark:text-white truncate">
          {title}
        </h1>
      </div>
      <img
        src="/assets/brand/app-icon.png"
        alt="BoraJunto"
        className="w-[36px] h-[36px] rounded-[10px] object-cover shrink-0 shadow-sm"
      />
    </div>
  );
};

interface BottomTabBarProps {
  activeTab: 'home' | 'groups' | 'ride' | 'profile';
  onNavigate: (screen: ScreenId) => void;
  onProfileClick?: () => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onNavigate,
  onProfileClick,
}) => {
  const tabs: Array<{
    id: 'home' | 'groups' | 'ride' | 'profile';
    label: string;
    target: ScreenId;
    icon: React.ReactNode;
  }> = [
    {
      id: 'home',
      label: 'Início',
      target: 'home',
      icon: <Home className="w-[20px] h-[20px]" strokeWidth={2.1} />,
    },
    {
      id: 'groups',
      label: 'Grupos',
      target: 'groups',
      icon: <Users className="w-[20px] h-[20px]" strokeWidth={1.9} />,
    },
    {
      id: 'ride',
      label: 'Minha volta',
      target: 'ride-active',
      icon: <MapPin className="w-[20px] h-[20px]" strokeWidth={1.9} />,
    },
    {
      id: 'profile',
      label: 'Perfil',
      target: 'home',
      icon: <User className="w-[20px] h-[20px]" strokeWidth={1.9} />,
    },
  ];

  return (
    <div className="bg-white dark:bg-[#161A25] border-t border-[#EAEEF3] dark:border-[#23293A] figma-nav-shadow shrink-0">
      <nav aria-label="Navegação principal" className="grid grid-cols-4 px-3 pt-2 pb-1">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (tab.id === 'profile' && onProfileClick) {
                  onProfileClick();
                } else {
                  onNavigate(tab.target);
                }
              }}
              className="flex flex-col items-center justify-center gap-[3px] py-1 cursor-pointer group"
            >
              <span
                className={`w-[50px] h-[30px] rounded-full flex items-center justify-center transition-colors ${
                  isActive
                    ? 'bg-[#DDF5FC] text-[#102536] dark:bg-[#133847] dark:text-[#5CE1FF]'
                    : 'text-[#596579] dark:text-[#94A3B8] group-hover:text-[#102536] dark:group-hover:text-white'
                }`}
              >
                {tab.icon}
              </span>
              <span
                className={`text-[11px] leading-tight whitespace-nowrap ${
                  isActive
                    ? 'font-bold text-[#102536] dark:text-white'
                    : 'font-medium text-[#596579] dark:text-[#94A3B8]'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
      <HomeIndicator />
    </div>
  );
};
