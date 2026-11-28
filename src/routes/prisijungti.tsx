import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SheetFrame } from "@/components/exam/ExamSheet";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { loginMode, loginSearch } from "@/lib/loginMode";

export const Route = createFileRoute("/prisijungti")({
  validateSearch: loginSearch,
  head: () => ({ meta: [ { title: "Prisijungimas – VBE uždavinių generatorius" }, { name: "description", content: "Prisijunkite prie VBE uždavinių generatoriaus." }, { property: "og:title", content: "Prisijungimas – VBE uždavinių generatorius" }, { property: "og:description", content: "Prisijunkite prie VBE uždavinių generatoriaus." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" } ] }),
  component: Login,
});

const GoogleG = () => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
);

function Login() {
  const nav = useNavigate();
  const search = Route.useSearch();
  const mode = loginMode(search.mode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) nav({ to: "/generuoti", replace: true }); });
    const { data } = supabase.auth.onAuthStateChange((e, s) => { if (e === "SIGNED_IN" && s) nav({ to: "/generuoti", replace: true }); });
    return () => data.subscription.unsubscribe();
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error("Neteisingas el. paštas arba slaptažodis");
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
      if (error) toast.error(error.message);
      else if (!data.session) toast.success("Patikrinkite el. paštą ir patvirtinkite registraciją.");
    }
    setBusy(false);
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/prisijungti" });
    if (r.error) toast.error("Nepavyko prisijungti su Google");
  };

  return (
    <div className="px-0 pt-10 sm:px-4">
      <div className="mx-auto max-w-lg">
        <SheetFrame title="VBE uždavinių generatorius" right="Matematika">
          <h1 className="mt-8 text-center font-serif text-2xl font-bold">{mode === "in" ? "Prisijungimas" : "Registracija"}</h1>
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <label className="block"><span className="exam-label">El. paštas</span><input type="email" required className="exam-input mt-1" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label className="block"><span className="exam-label">Slaptažodis</span><input type="password" required minLength={6} className="exam-input mt-1" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            <button className="btn-primary w-full" disabled={busy}>{mode === "in" ? "Prisijungti" : "Registruotis"}</button>
            <button type="button" className="btn-secondary flex w-full items-center justify-center gap-2" onClick={google}><GoogleG />Tęsti su Google</button>
          </form>
          <p className="mt-4 text-center text-sm">
            {mode === "in" ? "Neturite paskyros? " : "Jau turite paskyrą? "}
            <button className="font-bold underline" onClick={() => nav({ to: "/prisijungti", search: { mode: mode === "in" ? "up" : "in" }, replace: true })}>{mode === "in" ? "Registruotis" : "Prisijungti"}</button>
          </p>
        </SheetFrame>
      </div>
    </div>
  );
}
