import { useState } from 'react';
import { Brain, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [nomeClinica, setNomeClinica] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Função para limpar o telefone (apenas números)
  const cleanPhone = (val: string) => val.replace(/\D/g, '');

  // Formata o telefone para um "e-mail" técnico aceito pelo Supabase
  const getAuthEmail = (p: string) => `${cleanPhone(p)}@mentenexus.site`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Detectar se é email (admin) ou telefone (clínica)
    const isEmail = phone.includes('@');
    const authEmail = isEmail ? phone : getAuthEmail(phone);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      });

      if (error) {
        setError(isEmail ? 'E-mail ou senha incorretos' : 'Telefone ou senha incorretos');
        setLoading(false);
      }
    } else {
      // Cadastro de nova conta (apenas para clínicas via telefone)
      if (isEmail) {
        setError('O cadastro direto é apenas para clínicas. Contate o administrador.');
        setLoading(false);
        return;
      }
      
      if (!nomeClinica) {
        setError('Por favor, informe o nome da clínica');
        setLoading(false);
        return;
      }

      const { error, data } = await supabase.auth.signUp({
        email: authEmail,
        password,
        options: {
          data: {
            nome_clinica: nomeClinica,
            telefone_clinica: cleanPhone(phone)
          }
        }
      });

      if (error) {
        setError(error.message === 'User already registered' ? 'Esta clínica já possui cadastro' : error.message);
      } else if (data?.user?.identities?.length === 0) {
        setError('Esta clínica já possui cadastro');
      } else {
        setSuccess('Conta criada com sucesso! Faça login agora.');
        setIsLogin(true);
      }
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Elementos visuais de fundo */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl animate-pulse opacity-20" 
          style={{ backgroundColor: 'var(--bg-accent)' }}
        />
        <div 
          className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl animate-pulse opacity-20" 
          style={{ backgroundColor: 'var(--bg-accent)', animationDelay: '1s' }} 
        />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div 
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 shadow-lg transition-colors"
            style={{ background: 'linear-gradient(135deg, var(--bg-accent), #8b5cf6)' }}
          >
            <Brain className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Mente Nexus
          </h1>
          <p className="text-gray-400 mt-2 text-sm">Automação de Atendimento Clínico</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6">
            {isLogin ? 'Entrar no Sistema' : 'Nova Clínica'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nome da Clínica</label>
                <input
                  type="text"
                  value={nomeClinica}
                  onChange={(e) => setNomeClinica(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                  placeholder="Ex: Clínica Equilíbrio"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">WhatsApp ou E-mail</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                placeholder="Telefone ou Admin E-mail"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all pr-12"
                  placeholder="Sua senha"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-emerald-400 text-sm">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-purple-500/25 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isLogin ? (
                <>
                  <LogIn className="w-5 h-5" />
                  Entrar
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Criar Conta
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setSuccess('');
              }}
              className="text-gray-400 hover:text-white text-sm transition-colors decoration-purple-500 underline-offset-4 hover:underline"
            >
              {isLogin ? 'Não tem uma conta? Registre sua clínica' : 'Já tem cadastro? Faça o login'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}