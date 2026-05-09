import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PokeballLoader } from "./PokeballLoader";

const MIN_MS = 600;
const MAX_MS = 3500;

/**
 * Shows a Pokéball loader on every route change until the new route's
 * images (especially backgrounds) finish loading.
 */
export function RouteTransitionOverlay() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLoading = useRouterState({
    select: (s) => s.isLoading || s.isTransitioning,
  });
  const [visible, setVisible] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    let cancelled = false;
    setVisible(true);
    const start = Date.now();

    const waitForImages = async () => {
      // let the new route mount + insert its <img> tags
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const imgs = Array.from(document.images);
      await Promise.all(
        imgs.map((img) =>
          img.complete && img.naturalWidth > 0
            ? Promise.resolve()
            : new Promise<void>((res) => {
                const done = () => res();
                img.addEventListener("load", done, { once: true });
                img.addEventListener("error", done, { once: true });
              }),
        ),
      );
      const elapsed = Date.now() - start;
      if (elapsed < MIN_MS) await new Promise((r) => setTimeout(r, MIN_MS - elapsed));
      if (!cancelled) setVisible(false);
    };

    const failsafe = setTimeout(() => {
      if (!cancelled) setVisible(false);
    }, MAX_MS);

    waitForImages();
    return () => {
      cancelled = true;
      clearTimeout(failsafe);
    };
  }, [pathname]);

  // Also reflect router's own pending state (loaders, async transitions)
  useEffect(() => {
    if (isLoading) setVisible(true);
  }, [isLoading]);

  if (!visible) return null;
  return <PokeballLoader />;
}
