import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClientSocialAccounts, postingUrl, PLATFORM_LABEL } from "@/hooks/useClientSocialAccounts";
import { useToast } from "@/hooks/use-toast";

/** Opens the client's saved account for a platform. Optionally copies text first. Never publishes. */
export function OpenPlatformButton({
  clientId, platform, copyText, label, disabled, onOpened, size = "sm", variant = "outline",
}: {
  clientId: string | null | undefined;
  platform: string;
  copyText?: string;
  label?: string;
  disabled?: boolean;
  onOpened?: () => void;
  size?: "sm" | "default";
  variant?: "outline" | "default" | "ghost";
}) {
  const { toast } = useToast();
  const { data: accounts = [] } = useClientSocialAccounts(clientId);
  const account = accounts.find((a) => a.platform === platform);
  const url = postingUrl(platform, account);
  const name = PLATFORM_LABEL[platform] ?? platform;

  const open = async () => {
    if (!url) return;
    if (copyText) {
      try { await navigator.clipboard.writeText(copyText); toast({ title: "Copied — paste it into " + name }); } catch { /* ignore */ }
    }
    // Programmatic anchor click: more reliable than window.open under popup
    // blockers, and guarantees a top-level new tab (LinkedIn refuses to load
    // inside embedded frames, which shows ERR_BLOCKED_BY_RESPONSE).
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
    onOpened?.();
  };

  return (
    <Button
      size={size}
      variant={variant}
      disabled={disabled || !url}
      onClick={open}
      title={url ? undefined : `No ${name} profile link saved for this client`}
    >
      <ExternalLink className="h-3.5 w-3.5 mr-1" />
      {label ?? (copyText ? `Copy & open ${name}` : `Open ${name}`)}
    </Button>
  );
}
