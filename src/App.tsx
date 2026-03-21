import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import LoginPage from './components/LoginPage';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Agenda from './components/Agenda';
import Patients from './components/Patients';
import { supabase } from './supabaseClient';

type Page = 'dashboard' | 'agenda' | 'patients';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setUserEmail(session?.user?.email || '');
    });
  }, []);

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => setIsAuthenticated(true)} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} />;
      case 'agenda':
        return <Agenda />;
      case 'patients':
        return <Patients />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0a1e] via-[#1a1035] to-[#0d1b2a]">
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}

        onLogout={async () => {
          await supabase.auth.signOut();
          setIsAuthenticated(false);
        }}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        userEmail={userEmail}
      />

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar mobile */}
        <div className="lg:hidden sticky top-0 z-20 bg-[#0f0a1e]/80 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-semibold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Mente Nexus
          </h1>
        </div>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
