import React from 'react';
import { NavLink, useLocation } from 'react-router';
import {
  LayoutDashboard,
  Map as MapIcon,
  ListFilter,
  Route,
  TriangleAlert,
  Calendar,
  LogOut,
} from 'lucide-react';
import { ROUTES } from '@/shared/constants/app.constants';

interface SidebarProps {
  isOpen: boolean; // For mobile
  isCollapsed: boolean; // For desktop
  onCloseMobile?: () => void;
  onOpenSignOut: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  isCollapsed,
  onCloseMobile,
  onOpenSignOut,
}) => {
  const location = useLocation();

  const navItems = [
    {
      label: 'Dashboard',
      path: ROUTES.DASHBOARD,
      altPaths: [ROUTES.HOME],
      icon: LayoutDashboard,
    },
    {
      label: 'Map View',
      path: ROUTES.MAP,
      altPaths: [ROUTES.LIVE_TRACKING],
      icon: MapIcon,
    },
    {
      label: 'List View',
      path: ROUTES.LIST,
      altPaths: [],
      icon: ListFilter,
    },
    {
      label: 'Vehicle Replay',
      path: ROUTES.PLAYBACK,
      altPaths: [ROUTES.REPLAY],
      icon: Route,
    },
    {
      label: 'Alerts',
      path: ROUTES.ALERTS,
      altPaths: [],
      icon: TriangleAlert,
    },
    {
      label: 'Trip Reports',
      path: ROUTES.TRIP_REPORTS,
      altPaths: [ROUTES.E_RAVANNA],
      icon: Calendar,
    },
  ];

  const isItemActive = (item: (typeof navItems)[0]) => {
    if (location.pathname === item.path) return true;
    if (item.altPaths.some((p) => p === location.pathname)) return true;
    if (item.path === ROUTES.DASHBOARD && location.pathname === '/') return true;
    return false;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 flex flex-col justify-between bg-[#071a2e] text-slate-300 transition-all duration-300 ease-in-out border-r border-[#0e2a47] ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-64'} w-64`}
      >
        {/* Top Brand */}
        <div className="p-4 md:p-5 border-b border-[#0e2a47]/50 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            {/* <div className="w-8 h-8 rounded-lg bg-[#087f94] text-white font-bold flex items-center justify-center text-sm shadow-sm flex-shrink-0">
              R
            </div> */}
            {!isCollapsed && (
              <h1 className="text-lg font-bold text-white tracking-tight whitespace-nowrap transition-opacity duration-200">
                Rajasthan Mining
              </h1>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 py-4 px-2.5 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center rounded-lg text-sm font-medium transition-all ${
                  isCollapsed
                    ? 'justify-center px-2 py-3'
                    : 'gap-3.5 px-3.5 py-2.5'
                } ${
                  active
                    ? 'bg-[#087f94] text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-[#0e2a47]/70'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-white' : 'text-slate-300'}`} />
                {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </NavLink>
            );
          })}

          {/* Sign Out Button */}
          <button
            onClick={() => {
              onCloseMobile?.();
              onOpenSignOut();
            }}
            title={isCollapsed ? 'Sign Out' : undefined}
            className={`w-full flex items-center rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-[#0e2a47]/70 transition-all text-left ${
              isCollapsed
                ? 'justify-center px-2 py-3'
                : 'gap-3.5 px-3.5 py-2.5'
            }`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0 text-slate-300" />
            {!isCollapsed && <span className="whitespace-nowrap">Sign Out</span>}
          </button>
        </div>

        {/* Bottom Footer Badge */}
        <div className="p-4 border-t border-[#0e2a47]/50">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="w-8 h-8 rounded-lg bg-[#087f94] text-white font-bold flex items-center justify-center text-sm shadow-sm flex-shrink-0">
              R
            </div>
            {!isCollapsed && (
              <span className="font-bold text-xs tracking-wider text-white whitespace-nowrap">
                RAJMINES
              </span>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
