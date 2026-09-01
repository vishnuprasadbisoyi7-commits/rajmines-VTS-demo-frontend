import { useState, useEffect } from 'react';
import { Outlet } from 'react-router';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { SignOutModal } from './components/SignOutModal';
// import { SimulatorHUD } from '@/features/SimulatorControl/components/SimulatorHUD';
import { ThemeProvider } from '@/shared/context/ThemeContext';

function LayoutContent() {
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('rajmines-sidebar-collapsed');
    return saved === 'true';
  });

  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signOutToast, setSignOutToast] = useState(false);

  useEffect(() => {
    localStorage.setItem('rajmines-sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const handleToggleSidebar = () => {
    // If mobile, toggle mobile drawer; if desktop, toggle collapse
    if (window.innerWidth < 1024) {
      setSidebarMobileOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => !prev);
    }
  };

  const handleSignOutConfirm = () => {
    setSignOutOpen(false);
    setSignOutToast(true);
    setTimeout(() => {
      setSignOutToast(false);
    }, 4000);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#071a2e] font-sans antialiased text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Dark Navy Sidebar */}
      <Sidebar
        isOpen={sidebarMobileOpen}
        isCollapsed={sidebarCollapsed}
        onCloseMobile={() => setSidebarMobileOpen(false)}
        onOpenSignOut={() => setSignOutOpen(true)}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full bg-[#f8fafc] dark:bg-[#071322] overflow-hidden transition-colors duration-200">
        <TopHeader onToggleSidebar={handleToggleSidebar} />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 bg-[#f8fafc] dark:bg-[#071322] transition-colors duration-200">
          <Outlet />
        </main>
      </div>

      {/* Sign Out Modal */}
      <SignOutModal
        isOpen={signOutOpen}
        onClose={() => setSignOutOpen(false)}
        onConfirm={handleSignOutConfirm}
      />

      {/* Toast Notification */}
      {signOutToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-200 text-xs">
          <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
          <span>Signed out successfully. (JWT authentication will be connected soon)</span>
        </div>
      )}

      {/* Simulator HUD overlay - Commented out for now */}
      {/* <SimulatorHUD /> */}
    </div>
  );
}

export default function FullLayout() {
  return (
    <ThemeProvider>
      <LayoutContent />
    </ThemeProvider>
  );
}
