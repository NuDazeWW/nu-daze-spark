import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClientSocialAccounts, postingUrl, PLATFORM_LABEL } from "@/hooks/useClientSocialAccounts";
import { useToast } from "@/hooks/use-toast";
import { copyThenOpen } from "@/lib/openInNewTab";

/** Opens the client's saved account for a platform. Optionally copies text first. Never publishes. */
export function OpenPlatformButton({
  clientId, platform, copyText, label, disabled, onOpened, size = "sm", variant = "outline", className, iconOnly,
}: {
  iconOnly?: boolean;
  className?: string;
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

  const open = () => {
    if (!url) return;
    // Synchronous: copy is started and the tab opened within the same click.
    copyThenOpen(copyText, url).then((ok) => {
      if (ok) toast({ title: "Copied — paste it into " + name });
    });
    onOpened?.();
  };

  return (
    <Button
      size={size}
      variant={variant}
      disabled={disabled || !url}
      onClick={open}
      className={className}
      aria-label={iconOnly ? (label ?? (copyText ? `Copy & open ${name}` : `Open ${name}`)) : undefined}
      title={url ? (iconOnly ? (label ?? `Copy & open ${name}`) : undefined) : `No ${name} profile link saved for this client`}
    >
      <ExternalLink className={iconOnly ? "h-3.5 w-3.5" : "h-3.5 w-3.5 mr-1"} />
      {!iconOnly && (label ?? (copyText ? `Copy & open ${name}` : `Open ${name}`))}
    </Button>
  );
}
