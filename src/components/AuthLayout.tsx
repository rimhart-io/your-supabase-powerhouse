import { ReactNode } from "react";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{
        background:
          "linear-gradient(160deg, #fde047 0%, #fbbf24 35%, #ef4444 100%)",
      }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.25)]">
            PokéClash
          </h1>
          <p className="mt-1 text-xs uppercase tracking-[0.4em] text-white/90">
            by <span className="font-bold">Rakib</span>
          </p>
        </div>

        <div className="rounded-3xl border border-white/40 bg-white/95 text-slate-900 p-7 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.4)]">
          {children}
        </div>
      </div>
    </main>
  );
}
