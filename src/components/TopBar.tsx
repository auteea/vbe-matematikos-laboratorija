import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isAdmin } from "@/lib/db";

const link = "px-2 py-1 text-sm font-bold hover:bg-foreground hover:text-background";
const active = { className: "underline underline-offset-4" };

export function TopBar() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: admin } = useQuery({ queryKey: ["is-admin"], queryFn: isAdmin });
  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/prisijungti", replace: true });
  };
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
