import { Brain, CalendarDays, Users, LayoutDashboard, LogOut, X, Building2 } from 'lucide-react';

type Page = 'dashboard' | 'agenda' | 'patients' | 'clientes';

interface Props {
  currentPage: string;
  onNavigate: (page: any) => void;
  onLogout: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  userEmail?: string;
  tituloSite?: string;
  isAdmin?: boolean;
}

export default function Sidebar({ currentPage, onNavigate, onLogout, mobileOpen, onCloseMobile, userEmail, tituloSite, isAdmin }: Props) {

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'agenda', label: 'Agenda', icon: CalendarDays },
    { id: 'patients', label: 'Pacientes', icon: Users },
    ...(isAdmin ? [{ id: 'clientes', label: 'Clientes', icon: Building2 }] : []),
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              {tituloSite || 'Mente Nexus'}
            </h1>
          </div>
        </div>
        <button onClick={onCloseMobile} className="lg:hidden text-gray-400 hover:text-white cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => { onNavigate(item.id); onCloseMobile(); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${currentPage === item.id
                ? 'bg-gradient-to-r from-purple-600/20 to-cyan-600/20 text-white border border-purple-500/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center text-white text-sm font-bold">
            {userEmail?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 truncate">{userEmail || 'admin'}</p>
          </div>
          <button onClick={onLogout} className="text-gray-400 hover:text-red-400 transition-colors cursor-pointer" title="Sair">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex w-64 bg-[#0f0a1e]/80 backdrop-blur-xl border-r border-white/5 flex-col fixed inset-y-0 left-0 z-30">
        {sidebarContent}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onCloseMobile} />
          <aside className="fixed inset-y-0 left-0 w-64 bg-[#0f0a1e] border-r border-white/5 flex flex-col z-50">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}