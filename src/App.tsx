import { useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { BoraJuntoProvider, useBoraJunto } from './context/BoraJuntoContext';
import { GroupDetailScreen } from './screens/GroupDetailScreen';
import { GroupsListScreen } from './screens/GroupsListScreen';
import { HomeScreen } from './screens/HomeScreen';
import { LoginScreen } from './screens/LoginScreen';
import { RideActiveScreen } from './screens/RideActiveScreen';
import { SplitPixScreen } from './screens/SplitPixScreen';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { ScreenId } from './types';

const SCREEN_LIST: Array<{ id: ScreenId; code: string; label: string }> = [
  { id: 'welcome', code: '01', label: 'Boas-vindas' },
  { id: 'login', code: '02', label: 'Login' },
  { id: 'home', code: '03', label: 'Início' },
  { id: 'groups', code: '04', label: 'Grupos' },
  { id: 'group-detail', code: '05', label: 'Detalhes' },
  { id: 'split-pix', code: '06', label: 'Pix' },
  { id: 'ride-active', code: '07', label: 'Minha volta' },
];

function AppShell() {
  const { currentScreen, jumpToScreen, theme, setTheme } = useBoraJunto();

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'welcome':
        return <WelcomeScreen />;
      case 'login':
        return <LoginScreen />;
      case 'home':
        return <HomeScreen />;
      case 'groups':
        return <GroupsListScreen />;
      case 'group-detail':
        return <GroupDetailScreen />;
      case 'split-pix':
        return <SplitPixScreen />;
      case 'ride-active':
        return <RideActiveScreen />;
    }
  };

  return (
    <div className="min-h-screen bg-[#E9EEF4] dark:bg-[#090B10] transition-colors flex flex-col">
      {/* Prototype Navigation & Theme Switcher Bar (outside the 390x844 mobile UI) */}
      <header className="w-full border-b border-[#D7DFE9] dark:border-[#1E2433] bg-white/85 dark:bg-[#11141D]/90 backdrop-blur-md px-4 py-2.5 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 shrink-0">
            <img
              src="/assets/brand/app-icon.png"
              alt="BoraJunto"
              className="w-7 h-7 rounded-lg object-cover"
            />
            <span className="text-[13px] font-bold text-[#102536] dark:text-white whitespace-nowrap">
              BoraJunto · 01—07
            </span>
          </div>

          <nav
            aria-label="Telas do protótipo"
            className="flex items-center gap-1 overflow-x-auto max-w-full py-0.5"
          >
            {SCREEN_LIST.map((item) => {
              const active = currentScreen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => jumpToScreen(item.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#00D2FF] text-[#102536]'
                      : 'text-[#596579] dark:text-[#94A3B8] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[#102536] dark:hover:text-white'
                  }`}
                >
                  {item.code} {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#EEF2F6] dark:bg-[#1C2130] shrink-0">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold transition-colors cursor-pointer ${
                theme === 'light'
                  ? 'bg-white text-[#102536] shadow-xs'
                  : 'text-[#596579] dark:text-[#94A3B8] hover:text-white'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              Claro
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold transition-colors cursor-pointer ${
                theme === 'dark'
                  ? 'bg-[#282E40] text-white shadow-xs'
                  : 'text-[#596579] hover:text-[#102536]'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              Escuro
            </button>
          </div>
        </div>
      </header>

      {/* Centered Mobile Prototype Frame (390x844 exact Figma viewport) */}
      <main className="flex-1 flex items-center justify-center p-0 sm:p-6">
        <div className="relative w-full max-w-[390px] h-[844px] max-h-[calc(100vh-58px)] sm:max-h-[844px] sm:rounded-[40px] overflow-hidden shadow-[0_24px_60px_rgba(16,37,54,0.16)] dark:shadow-[0_24px_70px_rgba(0,0,0,0.65)] sm:border-[6px] sm:border-[#FFFFFF] dark:sm:border-[#1E2230] bg-[#F8F9FA] dark:bg-[#12151E]">
          {renderScreen()}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BoraJuntoProvider>
      <AppShell />
    </BoraJuntoProvider>
  );
}
