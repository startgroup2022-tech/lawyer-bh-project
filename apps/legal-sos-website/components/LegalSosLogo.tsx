import Image from "next/image";

export function LegalSosLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Image
      src="/images/legal-sos-logo.png"
      alt="Legal SOS"
      width={compact ? 58 : 82}
      height={compact ? 58 : 82}
      className="brand-logo"
      priority
    />
  );
}
