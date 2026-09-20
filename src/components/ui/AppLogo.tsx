export function AppLogo({ size = 28 }: { size?: number }) {
  return (
    <img
      className="app-logo"
      src="/favicon.svg"
      width={size}
      height={size}
      alt="Ludian"
      draggable={false}
    />
  );
}
