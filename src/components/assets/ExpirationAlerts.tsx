import { useMemo } from "react";
import { useAssets, type SourceAsset } from "@/hooks/useAssets";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function ExpirationAlerts() {
  const { assets } = useAssets();

  const expiringAssets = useMemo(() => {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return assets.filter((a) => {
      if (!a.expires_at) return false;
      const expDate = new Date(a.expires_at);
      return expDate > now && expDate <= sevenDaysFromNow;
    });
  }, [assets]);

  const expiredAssets = useMemo(() => {
    const now = new Date();
    return assets.filter((a) => a.expires_at && new Date(a.expires_at) < now);
  }, [assets]);

  if (expiringAssets.length === 0 && expiredAssets.length === 0) return null;

  return (
    <div className="space-y-3">
      {expiredAssets.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-sm">
            {expiredAssets.length} expired asset{expiredAssets.length !== 1 ? "s" : ""}
          </AlertTitle>
          <AlertDescription className="text-xs">
            <div className="flex flex-wrap gap-1 mt-1">
              {expiredAssets.slice(0, 5).map((a) => (
                <Badge key={a.id} variant="destructive" className="text-[10px]">{a.title}</Badge>
              ))}
              {expiredAssets.length > 5 && (
                <Badge variant="outline" className="text-[10px]">+{expiredAssets.length - 5} more</Badge>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
      {expiringAssets.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-sm">
            {expiringAssets.length} asset{expiringAssets.length !== 1 ? "s" : ""} expiring soon
          </AlertTitle>
          <AlertDescription className="text-xs">
            <div className="flex flex-wrap gap-1 mt-1">
              {expiringAssets.map((a) => (
                <Badge key={a.id} variant="outline" className="text-[10px]">
                  {a.title} — {formatDistanceToNow(new Date(a.expires_at!), { addSuffix: true })}
                </Badge>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
