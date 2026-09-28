"use client";

import Image from "next/image";
import { useState } from "react";
import { Building2 } from "lucide-react";
import type { GovernmentPartner } from "@/lib/practiceAreas";

type LogoSize = "sm" | "md" | "lg" | "xl" | "fixed";

export default function PartnerLogo({
  partner,
  size = "md",
  bare = false,
}: {
  partner: GovernmentPartner;
  size?: LogoSize;
  bare?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  const dims = (() => {
    switch (size) {
      case "sm":
        return {
          box: "w-7 h-7",
          image: "h-5 w-5",
          icon: "w-3.5 h-3.5",
          w: 28,
          h: 28,
          pad: "p-0",
        };

      case "md":
        return {
          box: "w-9 h-9",
          image: "h-7 w-7",
          icon: "w-4 h-4",
          w: 36,
          h: 36,
          pad: "p-0",
        };

      case "lg":
        return {
          box: "w-28 h-20",
          image: "h-16 w-24",
          icon: "w-9 h-9",
          w: 112,
          h: 80,
          pad: "p-1",
        };

      case "xl":
        return {
          box: "w-36 h-24",
          image: "h-20 w-32",
          icon: "w-10 h-10",
          w: 144,
          h: 96,
          pad: "p-1",
        };

      case "fixed":
      default:
        return {
          box: "w-36 h-24",
          image: "h-20 w-32",
          icon: "w-10 h-10",
          w: 160,
          h: 100,
          pad: "p-1",
        };
    }
  })();

  if (!partner.logo || failed) {
    return (
      <div
        className={`${dims.box} flex flex-shrink-0 items-center justify-center rounded-lg bg-primary/10`}
      >
        <Building2 className={`${dims.icon} text-primary`} />
      </div>
    );
  }

  if (bare) {
    return (
      <div className={`${dims.box} flex flex-shrink-0 items-center justify-center`}>
        <Image
          src={partner.logo}
          alt={`${partner.en} logo`}
          width={dims.w}
          height={dims.h}
          className={`${dims.image} ${dims.pad} object-contain`}
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative ${dims.box} flex flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-white`}
    >
      <Image
        src={partner.logo}
        alt={`${partner.en} logo`}
        width={dims.w}
        height={dims.h}
        className={`${dims.image} ${dims.pad} object-contain`}
        onError={() => setFailed(true)}
      />
    </div>
  );
}