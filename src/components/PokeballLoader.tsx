export function PokeballLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6 bg-background/80 backdrop-blur-md animate-fade-in">
      <div className="pokeball-loader">
        <div className="ball" />
        <div className="center" />
      </div>
      <div className="flex items-center gap-1 text-xs sm:text-sm uppercase tracking-[0.4em] font-black text-foreground/90">
        <span>{label}</span>
        <span className="inline-flex">
          <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
          <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
          <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
        </span>
      </div>
    </div>
  );
}
