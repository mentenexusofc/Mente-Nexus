import AdminClinicas from '../../components/Admin/AdminClinicas';

export function AdminClinicasPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold font-heading text-neutral-800 dark:text-white">
            Painel de Administração
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gerenciar clínicas do sistema
          </p>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <AdminClinicas />
        </div>
      </main>
    </div>
  );
}

export default AdminClinicasPage;
