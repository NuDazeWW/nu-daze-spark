/* Glossy 3D platform badges (mock-exact): brand gradients, inset highlights, glow. */
export function BrandBadge({ platform, size = 52 }: { platform: string; size?: number }) {
  const labels: Record<string, string> = { linkedin: "LinkedIn", instagram: "Instagram", facebook: "Facebook", x: "X" };
  const glyph =
    platform === "linkedin" ? <span className="sm-brand-glyph" style={{ fontSize: size * 0.44, letterSpacing: "-0.04em" }}>in</span> :
    platform === "facebook" ? <span className="sm-brand-glyph" style={{ fontSize: size * 0.52 }}>f</span> :
    platform === "instagram" ? (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden style={{ width: size * 0.56, height: size * 0.56 }}>
        <rect x="2.6" y="2.6" width="18.8" height="18.8" rx="5.4" />
        <circle cx="12" cy="12" r="4.3" />
        <circle cx="17.4" cy="6.6" r="1.15" fill="currentColor" stroke="none" />
      </svg>
    ) : (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ width: size * 0.52, height: size * 0.52 }}>
        <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.2l7.3-8.3L2.8 2h6.4l4.4 5.9L18.9 2zm-1.1 18h1.7L7.1 3.8H5.3L17.8 20z" />
      </svg>
    );
  return (
    <span className={`sm-brand-badge sm-brand-${platform}`} style={{ width: size, height: size }} role="img" aria-label={labels[platform] ?? platform} title={labels[platform] ?? platform}>
      {glyph}
    </span>
  );
}
