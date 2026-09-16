import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { SignOutModal } from './components/SignOutModal';
import { ThemeProvider } from '@/shared/context/ThemeContext';
import { useAuth } from '@/shared/context/AuthContext';
// import { ProtectedRoute } from '@/shared/components/ProtectedRoute';

function LayoutContent() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('rajmines-sidebar-collapsed');
    return saved === 'true';
  });

  const [signOutOpen, setSignOutOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('rajmines-sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const handleToggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setSidebarMobileOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => !prev);
    }
  };

  const handleSignOutConfirm = () => {
    setSignOutOpen(false);
    logout();
    navigate('/login', { replace: true });
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
    </div>
  );
}

export default function FullLayout() {
  return (
    <ThemeProvider>
      {/* ProtectedRoute commented out for now to bypass login page */}
      {/* <ProtectedRoute> */}
      <LayoutContent />
      {/* </ProtectedRoute> */}
    </ThemeProvider>
  );
}
