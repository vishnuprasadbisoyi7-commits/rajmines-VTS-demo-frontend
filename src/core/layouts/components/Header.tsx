import React from 'react';
import { NavLink, Link } from 'react-router';
import {
  Compass,
  MapPin,
  PlayCircle,
  FileText,
  ShieldAlert,
  Terminal,
  ExternalLink,
} from 'lucide-react';

export const Header: React.FC = () => {
  const navItems = [
    { label: 'Live Tracking', path: '/live-tracking', icon: Compass },
    { label: 'Route Playback', path: '/playback', icon: PlayCircle },
    { label: 'Mining Leases', path: '/geofences', icon: MapPin },
    { label: 'e-Ravanna Passes', path: '/e-ravanna', icon: FileText },
    { label: 'Alerts & SOS', path: '/alerts', icon: ShieldAlert },
    { label: 'AIS-140 Terminal', path: '/ais140', icon: Terminal },
  ];

  return (
    <header className="h-16 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 flex items-center justify-between sticky top-0 z-[1100] shadow-xl">
      {/* Brand & Portal Title */}
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2.5 group">
          {/* Emblem / Badge */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-950/50 border border-amber-400/40 text-slate-950 font-black text-lg group-hover:scale-105 transition">
            RM
          </div>
          <div>
            <div className="font-extrabold text-sm text-white tracking-wide flex items-center gap-1.5">
              <span>RajMines VTS</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                AIS-140
              </span>
            </div>
            <div className="text-[10px] font-semibold text-slate-400">
              Rajdharaa GIS • DMG Rajasthan
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
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
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
      <div className="flex items-center gap-3">
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
      </div>
    </header>
  );
};

export default Header;
