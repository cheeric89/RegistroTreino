import { useEffect, useRef } from "react";

export function useDialog(open, onClose, returnFocusRef) {
  const overlayRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!open || !overlay) return undefined;
    const dialog = overlay.querySelector('[role="dialog"]');
    const trigger = returnFocusRef?.current || document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const viewport = window.visualViewport;
    let frame;
    const resize = () => {
      overlay.style.setProperty("--dialog-height", `${viewport?.height || window.innerHeight}px`);
      overlay.style.setProperty("--dialog-top", `${viewport?.offsetTop || 0}px`);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (dialog?.contains(document.activeElement)) {
          document.activeElement.scrollIntoView({ block: "nearest" });
        }
      });
    };
    const focusables = () => [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')]
      .filter((element) => element.getClientRects().length);
    if (!dialog.contains(document.activeElement)) (focusables()[0] || dialog).focus();
    const keydown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current?.();
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      const first = items[0] || dialog;
      const last = items.at(-1) || dialog;
      if (!dialog.contains(document.activeElement) || (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    };
    resize();
    viewport?.addEventListener("resize", resize);
    viewport?.addEventListener("scroll", resize);
    window.addEventListener("resize", resize);
    document.addEventListener("keydown", keydown);
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", resize);
      viewport?.removeEventListener("scroll", resize);
      window.removeEventListener("resize", resize);
      document.removeEventListener("keydown", keydown);
      document.body.style.overflow = previousOverflow;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [open, returnFocusRef]);
  return overlayRef;
}
