import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { Briefcase, Home, FolderKanban, Inbox, Settings, LogOut, Menu, X } from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { toast } from 'sonner';

export const DashboardLayout = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await authAPI.getMe();
        setUser(response.data);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navItems = [
    { to: '/dashboard', icon: Home, label: 'Today' },
    { to: '/dashboard/inbox', icon: Inbox, label: 'Job Inbox' },
    { to: '/dashboard/tracker', icon: FolderKanban, label: 'Tracker' },
    { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF9] noise-bg relative">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-stone-200/60 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="w-6 h-6 text-[#064E3B]" strokeWidth={1.5} />
          <span className="text-lg font-medium text-stone-900">JobFlow</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          data-testid="mobile-menu-toggle"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-60 bg-[#F5F5F4] border-r border-stone-200/60 z-40 transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-stone-200/60 hidden lg:block">
          <div className="flex items-center gap-2">
            <Briefcase className="w-7 h-7 text-[#064E3B]" strokeWidth={1.5} />
            <span className="text-xl font-medium text-stone-900">JobFlow</span>
          </div>
        </div>

        <nav className="p-4 mt-16 lg:mt-0">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/dashboard'}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-white text-[#064E3B] shadow-sm'
                        : 'text-stone-600 hover:bg-white/50'
                    }`
                  }
                  data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                >
                  <item.icon className="w-5 h-5" strokeWidth={1.5} />
                  <span className="font-medium text-sm">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-stone-200/60">
          {user && (
            <div className="flex items-center gap-3 mb-3 px-2">
              <Avatar className="w-10 h-10">
                <AvatarImage src={user.picture} alt={user.name} />
                <AvatarFallback className="bg-[#064E3B] text-white">
                  {user.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-900 truncate">{user.name}</p>
                <p className="text-xs text-stone-500 truncate">{user.email}</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-stone-600 hover:text-[#DC2626] hover:bg-red-50"
            data-testid="logout-button"
          >
            <LogOut className="w-4 h-4 mr-2" strokeWidth={1.5} />
            Logout
          </Button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <main className="lg:ml-60 min-h-screen pt-16 lg:pt-0">
        <div className="max-w-6xl mx-auto p-8 md:p-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
