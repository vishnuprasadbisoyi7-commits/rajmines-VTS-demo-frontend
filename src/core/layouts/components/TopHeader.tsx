import React from 'react';
import { useLocation } from 'react-router';
import { PanelLeft, Sun, Moon } from 'lucide-react';
import { ROUTES } from '@/shared/constants/app.constants';
import { useTheme } from '@/shared/context/ThemeContext';

interface TopHeaderProps {
  onToggleSidebar: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onToggleSidebar }) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const getPageTitle = (pathname: string) => {
    switch (pathname) {
      case ROUTES.DASHBOARD:
      case ROUTES.HOME:
        return 'Dashboard';
      case ROUTES.MAP:
      case ROUTES.LIVE_TRACKING:
        return 'Map View';
      case ROUTES.LIST:
        return 'List View';
      case ROUTES.PLAYBACK:
      case ROUTES.REPLAY:
        return 'Vehicle Replay';
      case ROUTES.ALERTS:
        return 'Alerts';
      case ROUTES.TRIP_REPORTS:
      case ROUTES.E_RAVANNA:
        return 'Trip Reports';
      case ROUTES.GEOFENCES:
        return 'Mining Leases';
      case ROUTES.AIS140:
        return 'AIS-140 Terminal';
      default:
        return 'Dashboard';
    }
  };

  const title = getPageTitle(location.pathname);

  return (
    <header className="h-14 bg-white dark:bg-[#09182a] border-b border-slate-200/80 dark:border-slate-800/80 px-4 flex items-center justify-between sticky top-0 z-30 shadow-2xs transition-colors duration-200">
      {/* Left: Sidebar Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition focus:outline-none cursor-pointer"
          title="Toggle Sidebar"
        >
          <PanelLeft className="w-5 h-5" />
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {title}
        </h2>
      </div>

      {/* Right: Theme Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-amber-400 hover:text-slate-900 dark:hover:text-amber-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-2xs cursor-pointer flex items-center gap-1.5"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <Moon className="w-4 h-4 text-amber-400" />
          ) : (
            <Sun className="w-4 h-4 text-slate-600" />
          )}
        </button>
      </div>
    </header>
  );
};

export default TopHeader;
