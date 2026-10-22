import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { getAppScrollTop, scrollAppToTop } from "@/lib/appScroll";
import { cn } from "@/lib/utils";

const SHOW_AFTER_PX = 240;

/** Floating back-to-top arrow: same size, shape and color as the header back arrow, pinned bottom-left. */
export function BackToTopButton({ className }: { className?: string }) {
  const { state, isMobile } = useSidebar();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => { frame = 0; setShow(getAppScrollTop() > SHOW_AFTER_PX); };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update();
    document.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Keep the arrow just clear of the navigation panel, including when it is collapsed to icons.
  const left = isMobile
    ? "1rem"
    : state === "collapsed"
      ? "calc(var(--sidebar-width-icon) + 1rem)"
      : "calc(var(--sidebar-width) + 1rem)";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("sm-back-to-top h-7 w-7", className)}
      style={{ left }}
      data-visible={show ? "true" : "false"}
      aria-hidden={!show}
      tabIndex={show ? 0 : -1}
      onClick={scrollAppToTop}
      aria-label="Back to top"
      title="Back to top"
    >
      <ArrowUp strokeWidth={3} />
    </Button>
  );
}
