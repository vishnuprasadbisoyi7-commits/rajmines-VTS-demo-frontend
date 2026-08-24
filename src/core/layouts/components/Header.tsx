import React from 'react';
import { NavLink, Link } from 'react-router';
import { Compass } from 'lucide-react';
import rminesLogo from '@/assets/img/rmines-logo.png';

export const Header: React.FC = () => {
  const navItems = [
    { label: 'Live Tracking', path: '/live-tracking', icon: Compass },
    // { label: 'Route Playback', path: '/playback', icon: PlayCircle },
    // { label: 'Alerts & SOS', path: '/alerts', icon: ShieldAlert },
    // { label: 'List View', path: '/geofences', icon: MapPin },
    // { label: 'Trip Reports', path: '/e-ravanna', icon: FileText },
    // { label: 'AIS - 140 Terminal', path: '/ais140', icon: Terminal },
  ];

  return (
    <header className="h-16 bg-white/95 backdrop-blur border-b border-slate-200 px-4 flex items-center justify-between sticky top-0 z-[1100] shadow-sm">
      {/* Brand & Portal Title */}
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2.5 group">
          {/* Official Emblem Logo */}
          <img
            src={rminesLogo}
            alt="RajMines Logo"
            className="w-10 h-10 object-contain rounded-lg p-0.5 bg-white border border-slate-200 shadow-sm group-hover:scale-105 transition"
          />
          <div>
            <div className="font-extrabold text-sm text-slate-900 tracking-wide flex items-center gap-1.5">
              <span>RajMines VTS</span>
            </div>
            <div className="text-[10px] font-semibold text-slate-500">
              DMG Rajasthan
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation Tabs */}
      <nav className="hidden md:flex items-center gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-amber-50 text-amber-800 border border-amber-300 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Right Side Links & Status */}
      {/* <div className="flex items-center gap-3">
        <a
          href="https://gis.rajasthan.gov.in/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition shadow-sm"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>Rajdharaa GIS Portal</span>
          <ExternalLink className="w-3 h-3 text-slate-500" />
        </a>
      </div> */}
    </header>
  );
};

export default Header;
