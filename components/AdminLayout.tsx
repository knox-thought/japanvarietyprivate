import React from 'react';
import clsx from 'clsx';
import logoImage from '../logo/japan-variety-logo-1.png';

type AdminPage = 'dashboard' | 'processor' | 'data';

interface AdminLayoutProps {
  currentPage: AdminPage;
  onPageChange: (page: AdminPage) => void;
  children: React.ReactNode;
}

interface NavItem {
  id: AdminPage;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    id: 'processor',
    label: 'Quotation',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'data',
    label: 'จัดการข้อมูล',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
    ),
  },
];

export const AdminLayout: React.FC<AdminLayoutProps> = ({ currentPage, onPageChange, children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <img
              src={logoImage}
              alt="JAPANVARIETY PRIVATE"
              className="h-9 w-auto object-contain"
            />
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="font-serif font-bold text-base tracking-tight text-gray-900">
                JAPANVARIETY PRIVATE
              </span>
              <span className="text-[10px] tracking-[0.15em] text-amber-600 font-semibold uppercase">
                Admin Console
              </span>
            </div>
          </div>

          {/* Back to Main Site */}
          <button
            onClick={() => {
              window.history.pushState({}, '', '/');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="hidden sm:inline">กลับหน้าหลัก</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <nav className="px-4 sm:px-6">
          <div className="flex gap-1 -mb-px">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={clsx(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all",
                  currentPage === item.id
                    ? "text-amber-600 border-amber-500 bg-amber-50/50"
                    : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
                )}
              >
                {item.icon}
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-gray-400 text-xs border-t border-gray-200 bg-white mt-auto">
        <p className="tracking-widest uppercase">&copy; 2024 Japan Private Journeys - Admin Console</p>
      </footer>
    </div>
  );
};

