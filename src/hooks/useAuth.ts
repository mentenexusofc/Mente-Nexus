import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Busca usuário inicial
    const fetchInitialUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          const { data } = await supabase
            .from("perfis")
            .select("role")
            .eq("id", session.user.id)
            .single();
          setUser({ ...session.user, role: data?.role || "user" });
        }
      } catch (err) {
        console.error("Erro ao buscar sessão inicial:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialUser();

    // Escuta mudanças de sessão
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          if (session) {
            const { data } = await supabase
              .from("perfis")
              .select("role")
              .eq("id", session.user.id)
              .single();
            setUser({ ...session.user, role: data?.role || "user" });
          } else {
            setUser(null);
          }
        } catch (err) {
          console.error("Erro na mudança de auth:", err);
        } finally {
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
