import { useState, useEffect } from 'react'
import { Menu } from 'lucide-react'
import LoginPage from './components/LoginPage'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import Agenda from './components/Agenda'
import Patients from './components/Patients'
import Clientes from './components/Clientes'
import { supabase } from './supabaseClient'
import { getMeuPerfil } from './db'

type Page = 'dashboard' | 'agenda' | 'patients' | 'clientes'

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [perfil, setPerfil] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setIsAuthenticated(!!session)
      setUserEmail(session?.user?.email || '')
      if (session) {
        const p = await getMeuPerfil()
        setPerfil(p)
      }
    })
  }, [])

  if (!isAuthenticated) {
    return <LoginPage onLogin={async () => {
      setIsAuthenticated(true)
      const p = await getMeuPerfil()
      setPerfil(p)
    }} />
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard onNavigate={setCurrentPage} />
      case 'agenda': return <Agenda />
      case 'patients': return <Patients />
      case 'clientes': return perfil?.role === 'admin' ? <Clientes /> : <Dashboard onNavigate={setCurrentPage} />
    }
  }

  const tituloSite = perfil?.titulo_site || 'Mente Nexus'

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0a1e] via-[#1a1035] to-[#0d1b2a]">
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onLogout={async () => {
          await supabase.auth.signOut()
          setIsAuthenticated(false)
        }}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        userEmail={userEmail}
        tituloSite={tituloSite}
        isAdmin={perfil?.role === 'admin'}
      />
      <div className="lg:ml-64">
        <div className="lg:hidden sticky top-0 z-20 bg-[#0f0a1e]/80 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 cursor-pointer">
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-semibold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            {tituloSite}
          </h1>
        </div>
        <main className="p-4 sm:p-6 lg:p-8">{renderPage()}</main>
      </div>
    </div>
  )
}