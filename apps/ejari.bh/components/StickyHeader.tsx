"use client";

import { useEffect, useState } from "react";

export default function StickyHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header
      className={`
        sticky
        top-0
        z-50
        w-full
        bg-white/95
        backdrop-blur-xl
        transition-all
        duration-300
        ${scrolled
          ? "border-b border-transparent shadow-[0_4px_20px_rgba(31,41,55,0.04)]"
          : "border-b border-[#EAEAEC]"
        }
      `}
    >
      {children}
    </header>
  );
}