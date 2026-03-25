import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (sessionUser: any) => {
    try {
      const { data: perfil, error } = await supabase
        .from("perfis")
        .select("email, telefone, role")
        .eq("id", sessionUser.id)
        .single();

      if (error) {
        console.error("Erro ao buscar perfil:", error);
      }

      setUser({
        ...sessionUser,
        perfil,
        role: perfil?.role || "user",
      });
    } catch (err) {
      console.error("Erro na atualização do usuário:", err);
      setUser({ ...sessionUser, role: "user" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initSession = async () => {
      console.log("Iniciando initSession...");
      try {
        const { data: { user: sessionUser } } = await supabase.auth.getUser();
        if (sessionUser) {
          await fetchProfile(sessionUser);
        } else {
          setUser(null);
          setLoading(false);
        }
      } catch (err) {
        console.error("Erro ao inicializar sessão:", err);
        setLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          await fetchProfile(session.user);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}