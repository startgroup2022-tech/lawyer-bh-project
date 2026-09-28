import type { LucideIcon } from "lucide-react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

interface Props {
  icon: LucideIcon;
  title: string;
  gradient: string;
  href: string;
  learnMore: string;
}

export default function ServiceCard({
  icon: Icon,
  title,
  gradient,
  href,
  learnMore,
}: Props) {
  return (
    <Link
      href={href}
      className="
        relative
        rounded-2xl
        overflow-hidden
        aspect-[3/4]
        flex
        flex-col
        items-center
        justify-center
        p-6
        text-white
        group
        cursor-pointer
        transition-all
        duration-300
        hover:-translate-y-1
        hover:shadow-[0_16px_35px_rgba(2,154,122,0.22)]
      "
      style={{ backgroundImage: gradient }}
    >
      {/* Existing dark overlay */}
      <div
        className="
          absolute
          inset-0
          bg-gradient-to-b
          from-[#1a2a3f]/60
          via-[#1a2a3f]/75
          to-[#1a2a3f]/90
          group-hover:from-[#1a2a3f]/50
          group-hover:via-[#1a2a3f]/65
          group-hover:to-[#1a2a3f]/80
          transition-all
          duration-500
        "
      />

      {/* Subtle green hover glow */}
      <div
        className="
          absolute
          inset-0
          bg-primary/0
          group-hover:bg-primary/10
          transition-colors
          duration-500
        "
      />

      {/* Moving glow */}
      <div
        className="
          absolute
          -top-20
          -left-20
          w-48
          h-48
          rounded-full
          bg-primary/0
          group-hover:bg-primary/20
          blur-3xl
          transition-all
          duration-700
          group-hover:translate-x-10
          group-hover:translate-y-8
        "
      />

      {/* Shine animation */}
      <div
        className="
          absolute
          top-0
          -left-[120%]
          w-[60%]
          h-full
          rotate-12
          bg-gradient-to-r
          from-transparent
          via-white/10
          to-transparent
          group-hover:left-[140%]
          transition-all
          duration-700
          ease-in-out
        "
      />

      {/* Top-right clickable indicator */}
      <div
        className="
          absolute
          top-4
          right-4
          w-9
          h-9
          rounded-full
          bg-white/10
          border
          border-white/10
          flex
          items-center
          justify-center
          opacity-0
          scale-75
          group-hover:opacity-100
          group-hover:scale-100
          group-hover:bg-white
          group-hover:text-[#1a2a3f]
          transition-all
          duration-300
        "
      >
        <ArrowUpRight
          size={17}
          strokeWidth={2.5}
          className="
            transition-transform
            duration-300
            group-hover:rotate-45
          "
        />
      </div>

      {/* Main content */}
      <div
        className="
          relative
          z-10
          flex
          flex-col
          items-center
          text-center
          transition-transform
          duration-400
          group-hover:-translate-y-2
        "
      >
        {/* Icon */}
        <div
          className="
            transition-all
            duration-400
            group-hover:-translate-y-1
          "
        >
          <Icon
            className="
              w-14
              h-14
              stroke-[1.5]
              mb-4
              text-white/95
              transition-all
              duration-400
              group-hover:scale-110
            "
          />
        </div>

        {/* Title */}
        <h3
          className="
            text-base
            sm:text-lg
            font-bold
            leading-snug
            text-white
            drop-shadow-sm
          "
        >
          {title}
        </h3>

        {/* View Service */}
        <div
          className="
            mt-4
            flex
            items-center
            gap-2
            px-4
            py-2
            rounded-full
            bg-white/15
            border
            border-white/25
            backdrop-blur-sm
            text-sm
            font-semibold
            opacity-0
            translate-y-2
            scale-95
            group-hover:opacity-100
            group-hover:translate-y-0
            group-hover:scale-100
            transition-all
            duration-300
          "
        >
          <span>{learnMore}</span>

          <ArrowRight
            size={16}
            className="
              transition-transform
              duration-300
              group-hover:translate-x-1
            "
          />
        </div>
      </div>

      {/* Bottom progress/accent line */}
      <div
        className="
          absolute
          bottom-0
          left-0
          h-[3px]
          w-0
          bg-primary-light
          group-hover:w-full
          transition-all
          duration-500
          ease-out
        "
      />

      {/* Hover border */}
      <div
        className="
          absolute
          inset-0
          rounded-2xl
          border
          border-white/0
          group-hover:border-white/20
          transition-colors
          duration-300
          pointer-events-none
        "
      />
    </Link>
  );
}