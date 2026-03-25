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
import { ThemeProvider } from './store/theme'

type Page = 'dashboard' | 'agenda' | 'patients' | 'clientes'

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [perfil, setPerfil] = useState<any>(null)

  useEffect(() => {
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setIsAuthenticated(true)
          setUserEmail(session.user.email || '')
          const p = await getMeuPerfil()
          setPerfil(p)
        }
      } catch (err) {
        console.error('Erro na sessão inicial:', err)
      } finally {
        setLoading(false)
      }
    }

    initSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          if (event === 'SIGNED_IN' && session) {
            setIsAuthenticated(true)
            setUserEmail(session.user.email || '')
            const p = await getMeuPerfil()
            setPerfil(p)
          }
          if (event === 'SIGNED_OUT') {
            setIsAuthenticated(false)
            setUserEmail('')
            setPerfil(null)
          }
        } catch (err) {
          console.error('Erro na mudança de auth:', err)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard onNavigate={setCurrentPage} />
      case 'agenda': return <Agenda />
      case 'patients': return <Patients />
      case 'clientes':
        return perfil?.role === 'admin'
          ? <Clientes />
          : <Dashboard onNavigate={setCurrentPage} />
    }
  }

  const tituloSite = perfil?.titulo_site || 'Mente Nexus'
  const userIdentifier = perfil?.telefone_clinica || userEmail.split('@')[0]

  return (
    <ThemeProvider initialTheme={perfil?.tema}>
      {loading ? (
        <div 
          className="min-h-screen flex items-center justify-center transition-colors duration-300"
          style={{ backgroundColor: 'var(--bg-primary)' }}
        >
          <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : !isAuthenticated ? (
        <LoginPage />
      ) : (
        <div 
          className="min-h-screen transition-colors duration-300"
          style={{ backgroundColor: 'var(--bg-primary)' }}
        >
          <Sidebar
            currentPage={currentPage}
            onNavigate={setCurrentPage}
            onLogout={handleLogout}
            mobileOpen={mobileMenuOpen}
            onCloseMobile={() => setMobileMenuOpen(false)}
            userEmail={userIdentifier}
            tituloSite={tituloSite}
            isAdmin={perfil?.role === 'admin'}
          />
          <div className="lg:ml-64">
            <div 
              className="lg:hidden sticky top-0 z-20 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center gap-3 transition-colors duration-300"
              style={{ backgroundColor: 'var(--bg-primary)' }}
            >
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
      )}
    </ThemeProvider>
  )
}