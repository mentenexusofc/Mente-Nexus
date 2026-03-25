import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (sessionUser: any) => {
    try {
      console.log("🔍 Buscando perfil para:", sessionUser.id);
      
      const { data: perfil, error } = await supabase
        .from("perfis")
        .select("email, telefone, role")
        .eq("id", sessionUser.id)
        .single();

      if (error && error.code === "PGRST116") {
        console.log("✨ Perfil não encontrado. Criando perfil básico...");
        
        const { data: newPerfil, error: createError } = await supabase
          .from("perfis")
          .insert([
            {
              id: sessionUser.id,
              email: sessionUser.email,
              role: "user",
            },
          ])
          .select()
          .single();

        if (createError) {
          console.error("❌ Erro ao criar perfil:", createError);
          setUser({ ...sessionUser, role: "user" });
        } else {
          console.log("✅ Perfil criado com sucesso!");
          setUser({ ...sessionUser, perfil: newPerfil, role: "user" });
        }
        return;
      }

      if (error) {
        console.error("❌ Erro ao buscar perfil:", error);
      }

      setUser({
        ...sessionUser,
        perfil: perfil || null,
        role: perfil?.role || "user",
      });
    } catch (err) {
      console.error("💥 Erro inesperado:", err);
      setUser({ ...sessionUser, role: "user" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Timeout de segurança: 10 segundos para parar de carregar aconteça o que acontecer
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn("⚠️ Timeout de segurança atingido. Forçando fim do carregamento.");
        setLoading(false);
      }
    }, 10000);

    const init = async () => {
      console.log("🚀 Iniciando verificação de sessão...");
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        if (!mounted) return;

        if (session?.user) {
          await fetchProfile(session.user);
        } else {
          console.log("📭 Nenhuma sessão encontrada.");
          setUser(null);
          setLoading(false);
        }
      } catch (err) {
        console.error("❌ Erro na inicialização:", err);
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        console.log("🔔 Evento de Auth:", event);
        
        if (session?.user) {
          await fetchProfile(session.user);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);



  return { user, loading };
}