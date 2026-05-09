import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PokeballLoader } from "./PokeballLoader";

const MIN_MS = 1250;
const MAX_MS = 6500;
const SETTLE_MS = 450;
const IMAGE_WAIT_SLICE_MS = 1200;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const nextPaint = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

const waitForSingleImage = (img: HTMLImageElement) =>
  new Promise<void>((resolve) => {
    if (img.complete && img.naturalWidth > 0) {
      if (typeof img.decode === "function") {
        img.decode().catch(() => undefined).finally(() => resolve());
        return;
      }
      resolve();
      return;
    }

    const done = () => resolve();
    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", done, { once: true });
  });

/**
 * Shows a Pokéball loader on route changes until router work is done and
 * late-mounted images have fully settled, so pages appear already complete.
 */
export function RouteTransitionOverlay() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLoading = useRouterState({
    select: (s) => s.isLoading || s.isTransitioning,
  });
  const [visible, setVisible] = useState(false);
  const first = useRef(true);
  const loadingRef = useRef(isLoading);

  useEffect(() => {
    loadingRef.current = isLoading;
    if (isLoading) setVisible(true);
  }, [isLoading]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }

    let cancelled = false;
    setVisible(true);
    const startedAt = Date.now();

    const finishTransition = async () => {
      const deadline = startedAt + MAX_MS;

      while (!cancelled && loadingRef.current && Date.now() < deadline) {
        await wait(90);
      }

      if ((document as Document & { fonts?: FontFaceSet }).fonts) {
        await Promise.race([
          (document as Document & { fonts: FontFaceSet }).fonts.ready.catch(() => undefined),
          wait(800),
        ]);
      }

      let settledAt = 0;

      while (!cancelled && Date.now() < deadline) {
        await nextPaint();

        const pendingImages = Array.from(document.images).filter(
          (img) => !img.complete || img.naturalWidth === 0,
        );

        if (pendingImages.length === 0 && !loadingRef.current) {
          if (!settledAt) settledAt = Date.now();
          if (Date.now() - settledAt >= SETTLE_MS) break;
          await wait(90);
          continue;
        }

        settledAt = 0;

        if (pendingImages.length > 0) {
          await Promise.race([
            Promise.all(pendingImages.map(waitForSingleImage)),
            wait(IMAGE_WAIT_SLICE_MS),
          ]);
        } else {
          await wait(90);
        }
      }

      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_MS) {
        await wait(MIN_MS - elapsed);
      }

      if (!cancelled) setVisible(false);
    };

    finishTransition();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!visible) return null;
  return <PokeballLoader />;
}
