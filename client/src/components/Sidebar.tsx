import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquarePlus,
  Activity,
  CheckCircle2,
  History,
  Receipt,
  FolderArchive,
  Settings,
  Menu,
  X,
  Cpu,
  ShieldCheck,
} from 'lucide-react';
import { settingsService } from '../services/api.js';

interface SidebarProps {
  isBusy?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isBusy = false }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const location = useLocation();

  useEffect(() => {
    settingsService
      .getHealth()
      .then((data) => setHealthStatus(data))
      .catch(() => setHealthStatus(null));

    const interval = setInterval(() => {
      settingsService
        .getHealth()
        .then((data) => setHealthStatus(data))
        .catch(() => setHealthStatus(null));
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { to: '/', label: 'Home', icon: LayoutDashboard },
    { to: '/new-task', label: 'New Task', icon: MessageSquarePlus },
    { to: '/execution', label: 'Live Execution', icon: Activity },
    { to: '/summary', label: 'Completion Summary', icon: CheckCircle2 },
    { to: '/history', label: 'Tasks History', icon: History },
    { to: '/finance', label: 'Finance App', icon: Receipt },
    { to: '/files', label: 'Files', icon: FolderArchive },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-3 left-3 z-50">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg bg-brand-navy text-white shadow-md hover:bg-brand-navy-light"
          aria-label="Toggle Menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-[#142B4A] text-white flex flex-col justify-between z-40 transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } border-r border-[#1C3B66] shadow-xl`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-[#1C3B66]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Cpu className="text-white" size={22} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg tracking-tight text-white">CentrAlign</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  AI
                </span>
              </div>
              <p className="text-[11px] text-slate-400 tracking-wide">Autonomous Task Worker</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-[#1C3B66]'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Worker Status Widget */}
        <div className="p-4 border-t border-[#1C3B66] bg-[#0E1E34]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">AI Worker Status</span>
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Connected
            </span>
          </div>

          <div className="bg-[#142B4A] rounded-lg p-2.5 border border-[#1C3B66]/60 text-xs">
            <div className="flex items-center justify-between text-slate-300 mb-1">
              <span className="text-slate-400">Agent State:</span>
              <span className={`font-semibold ${isBusy ? 'text-amber-400' : 'text-emerald-400'}`}>
                {isBusy ? 'Executing Task' : 'Ready / Idle'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Engine:</span>
              <span className="font-mono text-[11px] text-blue-300">
                {healthStatus?.ai_worker?.model || 'Gemini Flash'}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
