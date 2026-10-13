import { Linkedin, Instagram, Facebook, Youtube, Globe } from "lucide-react";

function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const MAP: Record<string, (p: { className?: string }) => JSX.Element> = {
  linkedin: Linkedin, instagram: Instagram, facebook: Facebook, youtube: Youtube, x: XLogo,
};

export function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  const Icon = MAP[platform] ?? Globe;
  return <Icon className={className} />;
}
