import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit3, X, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { getTodosClientes, criarCliente, atualizarCliente, removerCliente } from '../db'

export default function Clientes() {
    const [clientes, setClientes] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editando, setEditando] = useState<any | null>(null)
    const [showSenha, setShowSenha] = useState(false)
    const [erro, setErro] = useState('')
    const [confirmDelete, setConfirmDelete] = useState<any | null>(null)
    const [confirmSenha, setConfirmSenha] = useState('')
    const [confirmErro, setConfirmErro] = useState('')

    const [form, setForm] = useState({
        email: '', senha: '', nome_empresa: '', titulo_site: '', google_client_id: '',
    })

    useEffect(() => { carregar() }, [])

    async function carregar() {
        setLoading(true)
        try {
            const data = await getTodosClientes()
            setClientes(data)
        } catch (e) { console.error(e) }
        setLoading(false)
    }

    function resetForm() {
        setForm({ email: '', senha: '', nome_empresa: '', titulo_site: '', google_client_id: '' })
        setEditando(null)
        setShowForm(false)
        setErro('')
    }

    function handleEditar(cliente: any) {
        setForm({
            email: '',
            senha: '',
            nome_empresa: cliente.nome_empresa || '',
            titulo_site: cliente.titulo_site || '',
            google_client_id: cliente.google_client_id || '',
        })
        setEditando(cliente)
        setShowForm(true)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setErro('')
        try {
            if (editando) {
                await atualizarCliente(editando.id, {
                    nome_empresa: form.nome_empresa,
                    titulo_site: form.titulo_site,
                    google_client_id: form.google_client_id,
                })
            } else {
                if (!form.email || !form.senha) { setErro('Email e senha são obrigatórios'); return }
                await criarCliente(form)
            }
            resetForm()
            carregar()
        } catch (e: any) {
            setErro(e.message)
        }
    }

    async function handleConfirmDelete() {
        setConfirmErro('')
        if (confirmSenha !== 'CONFIRMAR') {
            setConfirmErro('Digite CONFIRMAR para prosseguir')
            return
        }
        try {
            await removerCliente(confirmDelete.id)
            setConfirmDelete(null)
            setConfirmSenha('')
            carregar()
        } catch (e: any) {
            setConfirmErro(e.message)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Clientes</h1>
                    <p className="text-gray-400 mt-1">{clientes.length} cliente(s) cadastrado(s)</p>
                </div>
                <button onClick={() => { resetForm(); setShowForm(true) }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-medium rounded-xl cursor-pointer text-sm shadow-lg shadow-purple-500/25">
                    <Plus className="w-4 h-4" /> Novo Cliente
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Carregando...</div>
            ) : clientes.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                    <p className="text-gray-500">Nenhum cliente cadastrado</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {clientes.map(c => (
                        <div key={c.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/[0.07] transition-all">
                            <div className="flex items-start gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600/30 to-cyan-600/30 border border-purple-500/20 flex items-center justify-center text-white font-bold text-lg shrink-0">
                                    {(c.nome_empresa || '?').charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-semibold text-white truncate">{c.nome_empresa || '—'}</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">Título: {c.titulo_site || '—'}</p>
                                    {c.google_client_id && (
                                        <p className="text-xs text-emerald-400 mt-0.5">Google Calendar configurado</p>
                                    )}
                                </div>
                            </div>
                            <div className="mt-4 pt-3 border-t border-white/5 flex justify-end gap-1">
                                <button onClick={() => handleEditar(c)}
                                    className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white cursor-pointer">
                                    <Edit3 className="w-4 h-4" />
                                </button>
                                <button onClick={() => { setConfirmDelete(c); setConfirmSenha(''); setConfirmErro('') }}
                                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 cursor-pointer">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#1a1035] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">{editando ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                            <button onClick={resetForm} className="text-gray-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
                        </div>
                        {erro && (
                            <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                                <AlertTriangle className="w-4 h-4 shrink-0" />{erro}
                            </div>
                        )}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {!editando && (<>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Email *</label>
                                    <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                        placeholder="cliente@email.com" required />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Senha *</label>
                                    <div className="relative">
                                        <input type={showSenha ? 'text' : 'password'} value={form.senha}
                                            onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 pr-12"
                                            placeholder="Senha do cliente" required />
                                        <button type="button" onClick={() => setShowSenha(!showSenha)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer">
                                            {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </>)}
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Nome da empresa / clínica *</label>
                                <input type="text" value={form.nome_empresa} onChange={e => setForm(f => ({ ...f, nome_empresa: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                    placeholder="Ex: Clínica Saúde Mental" required />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Título no site *</label>
                                <input type="text" value={form.titulo_site} onChange={e => setForm(f => ({ ...f, titulo_site: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                    placeholder="Nome que aparece no menu" required />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Google Client ID</label>
                                <input type="text" value={form.google_client_id} onChange={e => setForm(f => ({ ...f, google_client_id: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                    placeholder="xxxxx.apps.googleusercontent.com" />
                                <p className="text-xs text-gray-600 mt-1">Deixe em branco para usar o padrão do sistema</p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={resetForm}
                                    className="flex-1 py-2.5 border border-white/10 text-gray-400 hover:text-white rounded-xl cursor-pointer text-sm">
                                    Cancelar
                                </button>
                                <button type="submit"
                                    className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-medium rounded-xl cursor-pointer text-sm">
                                    {editando ? 'Salvar' : 'Criar Cliente'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal dupla confirmação para deletar */}
            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#1a1035] border border-red-500/20 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-white">Remover cliente</h3>
                                <p className="text-xs text-gray-400">{confirmDelete.nome_empresa}</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-400 mb-4">
                            Esta ação é irreversível. Para confirmar, digite <span className="text-white font-mono font-bold">CONFIRMAR</span> abaixo:
                        </p>
                        <input type="text" value={confirmSenha} onChange={e => setConfirmSenha(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 mb-3"
                            placeholder="Digite CONFIRMAR" />
                        {confirmErro && <p className="text-xs text-red-400 mb-3">{confirmErro}</p>}
                        <div className="flex gap-3">
                            <button onClick={() => { setConfirmDelete(null); setConfirmSenha('') }}
                                className="flex-1 py-2.5 border border-white/10 text-gray-400 hover:text-white rounded-xl cursor-pointer text-sm">
                                Cancelar
                            </button>
                            <button onClick={handleConfirmDelete}
                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-medium rounded-xl cursor-pointer text-sm">
                                Remover
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}