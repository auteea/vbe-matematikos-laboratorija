import { Link } from "@tanstack/react-router";

// Step 1: no auth yet, so the admin link is always shown.
const IS_ADMIN = true;
const link = "px-2 py-1 text-sm font-bold hover:bg-foreground hover:text-background";
const active = { className: "underline underline-offset-4" };

export function TopBar() {
  return (
    <header className="no-print double-rule bg-background">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Link to="/generuoti" className="font-serif text-lg font-bold">VBE uždavinių generatorius</Link>
        <nav className="flex flex-wrap items-center gap-1">
          <Link to="/generuoti" className={link} activeProps={active}>Generuoti</Link>
          <Link to="/mano-rinkiniai" className={link} activeProps={active}>Mano rinkiniai</Link>
          {IS_ADMIN && <Link to="/admin/pavyzdziai" className={link} activeProps={active}>Pavyzdžiai</Link>}
          <Link to="/prisijungti" className={link}>Atsijungti</Link>
        </nav>
      </div>
    </header>
  );
}
