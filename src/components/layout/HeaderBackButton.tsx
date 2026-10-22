import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Header back arrow: same size/color as the sidebar collapse trigger. */
export function HeaderBackButton({ className }: { className?: string }) {
  const navigate = useNavigate();
  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate("/");
  };
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", className)}
      onClick={goBack}
      aria-label="Back to previous page"
      title="Back to previous page"
    >
      <ArrowLeft strokeWidth={3} />
    </Button>
  );
}
