import type * as React from "react";
import { Linkedin, Instagram, Facebook, Youtube, Globe } from "lucide-react";

function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  linkedin: Linkedin, instagram: Instagram, facebook: Facebook, youtube: Youtube, x: XLogo,
};

const LABELS: Record<string, string> = {
  linkedin: "LinkedIn", instagram: "Instagram", facebook: "Facebook", youtube: "YouTube", x: "X",
};

/**
 * Single source of truth for social platform icons.
 * Default ("brand") renders the approved full-color badge from the Dashboard
 * Weekly Cadence panel: brand-gradient rounded tile, white glyph.
 * Use tone="mono" only where a plain single-color glyph is required.
 */
export function PlatformIcon({
  platform,
  className,
  tone = "brand",
}: {
  platform: string;
  className?: string;
  tone?: "brand" | "mono";
}) {
  const Icon = MAP[platform] ?? Globe;
  if (tone === "mono") return <Icon className={className} />;
  return (
    <span
      className={`sm-pfi sm-pfi-${MAP[platform] ? platform : "other"}`}
      role="img"
      aria-label={LABELS[platform] ?? platform}
      title={LABELS[platform] ?? platform}
    >
      <Icon className={className} />
    </span>
  );
}
