import { motion } from "framer-motion";
import { ReactNode } from "react";
import bgAuth from "@/assets/bg-auth.jpg";
import pikachu from "@/assets/float-pikachu.png";
import charmander from "@/assets/float-charmander.png";
import bulbasaur from "@/assets/float-bulbasaur.png";
import squirtle from "@/assets/float-squirtle.png";

const FLOATERS = [
  { src: pikachu,    top: "8%",  left: "6%",  size: 110, delay: 0,   dur: 6 },
  { src: charmander, top: "70%", left: "4%",  size: 130, delay: 1.2, dur: 7 },
  { src: bulbasaur,  top: "12%", left: "84%", size: 120, delay: 0.6, dur: 6.5 },
  { src: squirtle,   top: "72%", left: "82%", size: 115, delay: 1.8, dur: 7.5 },
];

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen relative overflow-hidden flex items-center justify-center px-4 py-10">
      {/* Background */}
      <img src={bgAuth} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/20 to-background/70" />

      {/* Floating pokemon — desktop only to keep mobile clean */}
      <div className="absolute inset-0 hidden md:block pointer-events-none">
        {FLOATERS.map((f, i) => (
          <motion.img
            key={i}
            src={f.src}
            alt=""
            style={{ top: f.top, left: f.left, width: f.size, height: f.size, filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.5))" }}
            className="absolute object-contain"
            animate={{ y: [0, -18, 0], rotate: [0, 3, -3, 0] }}
            transition={{ duration: f.dur, delay: f.delay, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* Sparkles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(24)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-white"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              boxShadow: "0 0 8px rgba(255,255,255,0.9)",
            }}
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1.4, 0.5] }}
            transition={{ duration: 2 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 4 }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6"
        >
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight bg-gradient-to-r from-amber-300 via-rose-400 to-violet-400 bg-clip-text text-transparent drop-shadow-[0_4px_20px_rgba(255,180,80,0.35)]">
            PokéClash
          </h1>
          <p className="mt-1 text-xs uppercase tracking-[0.4em] text-white/70">
            by <span className="text-white font-bold">Rakib</span>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="relative rounded-3xl border border-white/15 bg-card/70 backdrop-blur-xl p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] overflow-hidden"
        >
          {/* holo sweep */}
          <div className="pointer-events-none absolute -inset-1 opacity-40"
            style={{ background: "conic-gradient(from 0deg, transparent, rgba(120,180,255,0.15), transparent 30%, rgba(255,150,200,0.15), transparent 60%)" }} />
          <div className="relative">{children}</div>
        </motion.div>
      </div>
    </main>
  );
}
