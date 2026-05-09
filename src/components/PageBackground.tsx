interface Props {
  src: string;
  /** Overlay darkness 0-1 */
  dim?: number;
  /** Optional accent gradient color overlay */
  tint?: string;
}

/**
 * Full-screen fixed game background with vignette + dark overlay,
 * sits below all page content (z -10).
 */
export function PageBackground({ src, dim = 0.55, tint }: Props) {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
      <img
        src={src}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{ background: `rgba(0,0,0,${dim})` }}
      />
      {tint && <div className="absolute inset-0" style={{ background: tint, mixBlendMode: "overlay" }} />}
      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)" }}
      />
    </div>
  );
}