import { ReactNode } from 'react';
import { useUser, useClerk, SignOutButton } from '@clerk/clerk-react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, LogOut, Upload, Home, FileText } from 'lucide-react';
import { useState } from 'react';

interface LayoutProps {
  children: ReactNode;
}

const VOM_LOGO = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyNCIgY3k9IjI0IiByPSIyMiIgZmlsbD0iIzBCMzU1OCIvPjxwYXRoIGQ9Ik0yNCAxMkMxNy4zNzMgMTIgMTIgMTcuMzczIDEyIDI0QzEyIDMwLjYyNyAxNy4zNzMgMzYgMjQgMzZDMzAuNjI3IDM2IDM2IDMwLjYyNyAzNiAyNEMzNiAxNy4zNzMgMzAuNjI3IDEyIDI0IDEyWiIgZmlsbD0iI0ZGNkIzNSIvPjwvc3ZnPg==';

export default function Layout({ children }: LayoutProps) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', href: '/', icon: Home },
    { label: 'Upload Video', href: '/upload', icon: Upload },
    { label: 'Posts', href: '/posts', icon: FileText },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:bg-navy md:text-white">
        <div className="flex items-center gap-3 p-6 border-b border-white border-opacity-10">
          <img src={VOM_LOGO} alt="VOM" className="w-10 h-10" />
          <div>
            <h1 className="text-lg font-bold">VOM</h1>
            <p className="text-xs text-orange">Video to Posts</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.href)
                    ? 'bg-orange text-white'
                    : 'text-white hover:bg-white hover:bg-opacity-10'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white border-opacity-10 p-4">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white border-opacity-10">
            <img
              src={user?.imageUrl}
              alt={user?.firstName}
              className="w-10 h-10 rounded-full"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-300 truncate">{user?.emailAddresses[0]?.emailAddress}</p>
            </div>
          </div>
          <SignOutButton>
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 transition-colors">
              <LogOut size={18} />
              <span className="font-medium">Sign Out</span>
            </button>
          </SignOutButton>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden w-full flex flex-col">
        <header className="bg-navy text-white px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={VOM_LOGO} alt="VOM" className="w-8 h-8" />
            <span className="font-bold">VOM</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 hover:bg-white hover:bg-opacity-10 rounded"
          >
            <Menu size={24} />
          </button>
        </header>

        {mobileMenuOpen && (
          <nav className="bg-navy text-white px-4 py-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.href)
                      ? 'bg-orange text-white'
                      : 'text-white hover:bg-white hover:bg-opacity-10'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        )}

        <main className="flex-1 overflow-auto w-full">
          {children}
        </main>
      </div>

      {/* Main Content */}
      <main className="hidden md:flex md:flex-1 md:flex-col md:overflow-auto">
        {children}
      </main>
    </div>
  );
}
