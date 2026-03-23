import { useTheme } from "../store/theme";

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  const themes = [
    { id: "light", color: "bg-white border-gray-200", label: "Claro" },
    { id: "dark", color: "bg-slate-900 border-slate-700", label: "Escuro" },
    { id: "blue", color: "bg-sky-500 border-sky-400", label: "Azul" },
    { id: "pink", color: "bg-pink-500 border-pink-400", label: "Rosa" },
  ];

  return (
    <div className="flex gap-3">
      {themes.map((t) => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id)}
          className={`w-10 h-10 rounded-xl border-2 transition-all duration-300 cursor-pointer flex items-center justify-center shadow-lg ${t.color} ${
            theme === t.id 
              ? "border-purple-500 ring-2 ring-purple-500/20 scale-110 shadow-purple-500/20" 
              : "border-white/10 opacity-60 hover:opacity-100 hover:scale-105"
          }`}
          title={t.label}
        >
          {theme === t.id && (
            <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_purple]" />
          )}
        </button>
      ))}
    </div>
  );
}