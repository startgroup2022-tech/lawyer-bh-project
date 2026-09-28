import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  title: string;
  gradient: string;
}

export default function ServiceCard({ icon: Icon, title, gradient }: Props) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden aspect-[3/4] flex flex-col items-center justify-center p-6 text-white group cursor-pointer"
      style={{ backgroundImage: gradient }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a2a3f]/60 via-[#1a2a3f]/75 to-[#1a2a3f]/90 group-hover:from-[#1a2a3f]/50 group-hover:to-[#1a2a3f]/85 transition-colors" />
      <div className="relative z-10 flex flex-col items-center text-center">
        <Icon className="w-14 h-14 stroke-[1.5] mb-4 text-white/95" />
        <h3 className="text-base sm:text-lg font-bold leading-snug text-white drop-shadow-sm">
          {title}
        </h3>
      </div>
    </div>
  );
}
