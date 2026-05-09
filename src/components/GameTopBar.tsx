import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { ChevronLeft, Coins } from "lucide-react";

interface Props {
  title?: string;
  back?: string;
}

export function GameTopBar({ title, back = "/dashboard" }: Props) {
  const { profile, user } = useAuth();
  const nav = useNavigate();
  if (!user) return null;
  return (
    <header className="sticky top-0 z-30 px-3 pt-3 pb-2">
      <div className="flex items-center justify-between gap-2 max-w-5xl mx-auto">
        <button
          onClick={() => nav({ to: back })}
          className="game-glass-dark rounded-full pl-2 pr-3 py-1.5 flex items-center gap-1 text-white font-bold text-sm"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="hidden sm:inline">Back</span>
        </button>
        {title && (
          <div className="game-glass-dark rounded-full px-4 py-1.5 text-white font-black tracking-wide text-sm sm:text-base text-stroke">
            {title}
          </div>
        )}
        <Link
          to="/shop"
          className="game-glass-dark rounded-full pl-2 pr-3 py-1.5 flex items-center gap-1.5 text-white font-bold text-sm"
        >
          <span className="h-6 w-6 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 grid place-items-center shadow-inner">
            <Coins className="h-3.5 w-3.5 text-amber-900" />
          </span>
          {profile?.coins ?? 0}
        </Link>
      </div>
    </header>
  );
}
