export function LogoMark({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" data-testid="logo-mark" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#E0533C" />
      <path d="M32 12 L50 44 A20 20 0 0 1 14 44 Z" fill="#F7F3EE" />
      <circle cx="32" cy="33" r="4" fill="#E0533C" />
      <circle cx="25.5" cy="41" r="3" fill="#E5A93C" />
      <circle cx="38.5" cy="41" r="3" fill="#E5A93C" />
    </svg>
  );
}

export function Logo() {
  return (
    <div className="flex items-center gap-3" data-testid="brand-logo">
      <LogoMark />
      <div className="leading-tight">
        <p className="font-display text-lg font-extrabold tracking-tight text-cream">Mr Pizza</p>
        <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold">Gerência</p>
      </div>
    </div>
  );
}
