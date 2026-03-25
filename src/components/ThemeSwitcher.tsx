import { useTheme } from "../store/theme";
import { atualizarMeuPerfil } from "../db";

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  const handleSetTheme = async (id: string) => {
    setTheme(id); // Muda na hora no UI
    try {
      await atualizarMeuPerfil({ tema: id }); // Salva no banco
    } catch (e) {
      console.error("Erro ao salvar tema:", e);
    }
  };

  const themes = [
    { id: "dark", color: "bg-[#0a0514] border-[#120925]", label: "Premium Dark", accent: "from-violet-500 to-purple-600" },
    { id: "blue", color: "bg-[#020617] border-[#0f172a]", label: "Ocean Blue", accent: "from-sky-500 to-blue-600" },
    { id: "pink", color: "bg-[#0d020d] border-[#1a051a]", label: "Cyber Pink", accent: "from-pink-500 to-rose-600" },
  ];

  return (
    <div className="flex gap-4">
      {themes.map((t) => (
        <button
          key={t.id}
          onClick={() => handleSetTheme(t.id)}
          className={`group relative w-12 h-12 rounded-2xl border-2 transition-all duration-500 cursor-pointer flex items-center justify-center overflow-hidden ${t.color} ${
            theme === t.id 
              ? "border-purple-500 ring-4 ring-purple-500/20 scale-105 shadow-[0_0_20px_rgba(139,92,246,0.2)]" 
              : "border-white/5 opacity-60 hover:opacity-100 hover:scale-105 hover:border-white/20"
          }`}
          title={t.label}
        >
          {/* Accent bar at the bottom */}
          <div className={`absolute inset-0 bg-gradient-to-br ${t.accent} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
          
          {theme === t.id ? (
            <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${t.accent} shadow-[0_0_15px_var(--bg-accent)] animate-pulse`} />
          ) : (
             <div className="w-1.5 h-1.5 rounded-full bg-white/20 group-hover:bg-white/40 transition-colors" />
          )}
        </button>
      ))}
    </div>
  );
}