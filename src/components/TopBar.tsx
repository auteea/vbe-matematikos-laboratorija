import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isAdmin } from "@/lib/db";

const link = "px-2 py-1 text-sm font-bold hover:bg-foreground hover:text-background";
const active = { className: "underline underline-offset-4" };

export function TopBar() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  // Track the signed-in user so the bar updates on sign-in/sign-out without a reload.
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  const { data: admin } = useQuery({ queryKey: ["is-admin", userId], queryFn: isAdmin, enabled: !!userId });
  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/prisijungti", replace: true });
  };
  if (!userId) return null;
  return (
    <header className="no-print double-rule bg-background">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Link to="/generuoti" className="font-serif text-lg font-bold">VBE uždavinių generatorius</Link>
        <nav className="flex flex-wrap items-center gap-1">
          <Link to="/generuoti" className={link} activeProps={active}>Generuoti</Link>
          <Link to="/mano-rinkiniai" className={link} activeProps={active}>Mano rinkiniai</Link>
          {admin && <Link to="/admin/pavyzdziai" className={link} activeProps={active}>Pavyzdžiai</Link>}
          <button type="button" className={link} onClick={signOut}>Atsijungti</button>
        </nav>
      </div>
    </header>
  );
}
