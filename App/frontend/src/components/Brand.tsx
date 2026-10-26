/** Logo de Red de Acopio */
export function BrandMark({ size = 44 }: { size?: number }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }} aria-hidden="true">
      <img src="/assets/images/logo.png" alt="" width={size} height={size} />
    </span>
  );
}
