import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Coins, LogOut, Sparkles, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { to: "/dashboard", label: "Home" },
  { to: "/gallery", label: "Gallery" },
  { to: "/loadout", label: "Loadout" },
  { to: "/training", label: "Training" },
  { to: "/battle", label: "Battle" },
  { to: "/campaign", label: "Campaign" },
  { to: "/shop", label: "Shop" },
  { to: "/items", label: "Items" },
] as const;

export function AppHeader() {
  const { profile, signOut, user } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2">
        <Link to="/dashboard" className="flex items-center gap-2 font-black tracking-tight text-base sm:text-lg shrink-0">
          <Sparkles className="h-5 w-5 text-primary" />
          <span>POKÉCLASH</span>
        </Link>
        <nav className="hidden md:flex items-center gap-5 text-sm">
          {NAV_LINKS.map(l => (
            <Link key={l.to} to={l.to} activeProps={{ className: "text-primary" }}>{l.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full bg-secondary text-xs sm:text-sm font-bold">
            <Coins className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[var(--rarity-legendary)]" />
            {profile?.coins ?? 0}
          </div>
          <Button size="icon" variant="ghost" className="hidden sm:inline-flex" onClick={async () => { await signOut(); nav({ to: "/" }); }}>
            <LogOut className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="md:hidden" onClick={() => setOpen(o => !o)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      {/* Mobile drawer */}
      <div className={cn("md:hidden overflow-hidden border-t border-border bg-background/95 backdrop-blur transition-[max-height] duration-300",
        open ? "max-h-[420px]" : "max-h-0")}>
        <nav className="px-3 py-3 grid grid-cols-2 gap-1">
          {NAV_LINKS.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)}
              activeProps={{ className: "bg-primary text-primary-foreground" }}
              className="px-3 py-2 rounded-lg text-sm font-semibold bg-secondary/60 hover:bg-secondary">
              {l.label}
            </Link>
          ))}
          <button onClick={async () => { setOpen(false); await signOut(); nav({ to: "/" }); }}
            className="col-span-2 px-3 py-2 rounded-lg text-sm font-semibold bg-destructive/20 text-destructive flex items-center justify-center gap-1.5">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </nav>
      </div>
    </header>
  );
}
