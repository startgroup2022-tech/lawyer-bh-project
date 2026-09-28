"use client";

import { useEffect, useState } from "react";

import {
  Bell,
  Building2,
  ChevronDown,
  FileText,
  House,
  LayoutDashboard,
  Languages,
  LogOut,
  Menu,
  UserRound,
  X,
  Clock3,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type Props = {
  locale: string;
};

export default function OwnerHeader({ locale }: Props) {
  const pathname = usePathname();
  const t = useTranslations();

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const otherLocale = locale === "ar" ? "en" : "ar";
  const isAr = locale === "ar";

  /* =====================================================
      SCROLL ANIMATION
  ===================================================== */

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 12);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  /* =====================================================
      ESCAPE KEY
  ===================================================== */

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
      }
    };

    if (notificationsOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [notificationsOpen]);

  /* =====================================================
      PREVENT BODY SCROLL
  ===================================================== */

  useEffect(() => {
    if (notificationsOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [notificationsOpen]);

  /* =====================================================
      OWNER NAVIGATION
  ===================================================== */

  const navItems = [
    {
      href: "/owner",
      label: t("owner.nav.dashboard"),
      icon: LayoutDashboard,
    },
    {
      href: "/owner/properties",
      label: t("owner.nav.properties"),
      icon: Building2,
    },
    {
      href: "/owner/units",
      label: t("owner.nav.units"),
      icon: House,
    },
    {
      href: "/owner/contracts",
      label: t("owner.nav.contracts"),
      icon: FileText,
    },
  ];

  /* =====================================================
      ACTIVE LINK
  ===================================================== */

  const isActive = (href: string) => {
    if (href === "/owner") {
      return pathname === "/owner";
    }

    return pathname.startsWith(href);
  };

  /* =====================================================
      NOTIFICATIONS
  ===================================================== */

  const notifications = [
    {
      id: 1,
      type: "contract",
      title: t("owner.notification.newContract"),
      description: t("owner.notification.newContractDesc"),
      time: t("owner.notification.minutesAgo"),
      unread: true,
      icon: FileText,
    },

    {
      id: 2,
      type: "warning",
      title: t("owner.notification.expiring"),
      description: t("owner.notification.expiringDesc"),
      time: t("owner.notification.hourAgo"),
      unread: true,
      icon: AlertCircle,
    },

    {
      id: 3,
      type: "success",
      title: t("owner.notification.approved"),
      description: t("owner.notification.approvedDesc"),
      time: t("owner.notification.hoursAgo"),
      unread: false,
      icon: CheckCircle2,
    },
  ];

  const unreadCount = notifications.filter(
    (notification) => notification.unread
  ).length;

  return (
    <>
      {/* =====================================================
          HEADER
      ===================================================== */}


      {/* =====================================================
          NOTIFICATION OVERLAY
      ===================================================== */}

      <div
        className={`
          fixed
          inset-0
          z-[60]
          bg-[#1A2A3F]/30
          backdrop-blur-[2px]
          transition-all
          duration-300

          ${
            notificationsOpen
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          }
        `}
        onClick={() =>
          setNotificationsOpen(false)
        }
      />

      {/* =====================================================
          NOTIFICATION DRAWER
      ===================================================== */}

      <aside
        dir={isAr ? "rtl" : "ltr"}
        className={`
          fixed
          top-0
          z-[70]
          flex
          h-screen
          w-full
          max-w-[420px]
          flex-col
          bg-white
          shadow-[0_20px_60px_rgba(31,41,55,0.18)]
          transition-transform
          duration-500
          ease-[cubic-bezier(0.22,1,0.36,1)]

          ${
            isAr
              ? "right-0"
              : "left-0"
          }

          ${
            notificationsOpen
              ? "translate-x-0"
              : isAr
                ? "translate-x-full"
                : "-translate-x-full"
          }
        `}
      >

        {/* =================================================
            DRAWER HEADER
        ================================================= */}

        <div
          className="
            flex
            h-[78px]
            shrink-0
            items-center
            justify-between
            border-b
            border-[#EAEAEC]
            bg-white
            px-5
            sm:px-6
          "
        >
          <div className="flex items-center gap-3">

            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                bg-[#EAFBF6]
                text-primary
              "
            >
              <Bell
                size={19}
                strokeWidth={1.7}
              />
            </div>

            <div>
              <h2
                className="
                  text-base
                  font-extrabold
                  text-text-primary
                "
              >
                {t("owner.nav.notifications")}
              </h2>

              <p
                className="
                  mt-0.5
                  text-[11px]
                  text-text-muted
                "
              >
                {unreadCount}{" "}
                {t("owner.notification.newCount")}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setNotificationsOpen(false)
            }
            aria-label={t(
              "owner.notification.close"
            )}
            className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-lg
              text-text-muted
              transition-all
              duration-300
              hover:bg-[#F4F7FA]
              hover:text-text-primary
            "
          >
            <X size={19} />
          </button>
        </div>

        {/* =================================================
            NOTIFICATION CONTENT
        ================================================= */}

        <div className="flex-1 overflow-y-auto">

          {/* SUMMARY */}

          <div
            className="
              border-b
              border-[#EAEAEC]
              bg-[#F8FAFB]
              px-5
              py-4
              sm:px-6
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
              "
            >
              <div>
                <p
                  className="
                    text-xs
                    font-bold
                    text-text-muted
                  "
                >
                  {t("owner.notification.center")}
                </p>

                <p
                  className="
                    mt-1
                    text-sm
                    font-extrabold
                    text-text-primary
                  "
                >
                  {t("owner.notification.centerDesc")}
                </p>
              </div>

              {unreadCount > 0 && (
                <span
                  className="
                    rounded-full
                    bg-[#EAFBF6]
                    px-3
                    py-1.5
                    text-[10px]
                    font-extrabold
                    text-primary
                  "
                >
                  {unreadCount}{" "}
                  {t("owner.notification.new")}
                </span>
              )}
            </div>
          </div>

          {/* NOTIFICATIONS */}

          <div className="divide-y divide-[#EAEAEC]">

            {notifications.map(
              ({
                id,
                title,
                description,
                time,
                unread,
                icon: Icon,
                type,
              }) => (
                <button
                  key={id}
                  type="button"
                  className={`
                    group
                    relative
                    flex
                    w-full
                    gap-4
                    px-5
                    py-5
                    text-start
                    transition-all
                    duration-300
                    hover:bg-[#F8FAFB]

                    ${
                      unread
                        ? "bg-white"
                        : "bg-white/70"
                    }
                  `}
                >

                  {/* UNREAD */}

                  {unread && (
                    <span
                      className={`
                        absolute
                        top-6
                        h-2
                        w-2
                        rounded-full
                        bg-primary

                        ${
                          isAr
                            ? "right-2"
                            : "left-2"
                        }
                      `}
                    />
                  )}

                  {/* ICON */}

                  <div
                    className={`
                      flex
                      h-11
                      w-11
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      transition-all
                      duration-300
                      group-hover:scale-105

                      ${
                        type === "warning"
                          ? "bg-amber-50 text-amber-500"
                          : type === "success"
                            ? "bg-emerald-50 text-emerald-500"
                            : "bg-[#EAFBF6] text-primary"
                      }
                    `}
                  >
                    <Icon
                      size={19}
                      strokeWidth={1.7}
                    />
                  </div>

                  {/* CONTENT */}

                  <div className="min-w-0 flex-1">

                    <div
                      className={`
                        text-sm
                        leading-6

                        ${
                          unread
                            ? "font-extrabold text-text-primary"
                            : "font-bold text-text-secondary"
                        }
                      `}
                    >
                      {title}
                    </div>

                    <p
                      className="
                        mt-1
                        text-xs
                        leading-5
                        text-text-muted
                      "
                    >
                      {description}
                    </p>

                    <div
                      className="
                        mt-2
                        flex
                        items-center
                        gap-1.5
                        text-[10px]
                        font-semibold
                        text-text-muted
                      "
                    >
                      <Clock3
                        size={12}
                        strokeWidth={1.6}
                      />

                      {time}
                    </div>
                  </div>

                  {/* ARROW */}

                  {isAr ? (
                    <ArrowLeft
                      size={15}
                      className="
                        mt-1
                        shrink-0
                        text-text-muted
                        opacity-0
                        transition-all
                        duration-300
                        group-hover:translate-x-[-3px]
                        group-hover:opacity-100
                      "
                    />
                  ) : (
                    <ArrowRight
                      size={15}
                      className="
                        mt-1
                        shrink-0
                        text-text-muted
                        opacity-0
                        transition-all
                        duration-300
                        group-hover:translate-x-[3px]
                        group-hover:opacity-100
                      "
                    />
                  )}

                </button>
              )
            )}
          </div>

          {/* EMPTY STATE */}

          {notifications.length === 0 && (
            <div
              className="
                flex
                min-h-[400px]
                flex-col
                items-center
                justify-center
                px-8
                text-center
              "
            >
              <div
                className="
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-full
                  bg-[#F4F7FA]
                  text-text-muted
                "
              >
                <Bell size={26} />
              </div>

              <h3
                className="
                  mt-5
                  text-sm
                  font-extrabold
                  text-text-primary
                "
              >
                {t("owner.notification.emptyTitle")}
              </h3>

              <p
                className="
                  mt-2
                  max-w-[260px]
                  text-xs
                  leading-5
                  text-text-muted
                "
              >
                {t(
                  "owner.notification.emptyDescription"
                )}
              </p>
            </div>
          )}
        </div>

        {/* =================================================
            DRAWER FOOTER
        ================================================= */}

        <div
          className="
            shrink-0
            border-t
            border-[#EAEAEC]
            bg-white
            p-4
            sm:p-5
          "
        >
          <Link
            href="/owner/notifications"
            onClick={() =>
              setNotificationsOpen(false)
            }
            className="
              flex
              h-11
              w-full
              items-center
              justify-center
              rounded-xl
              bg-primary
              text-xs
              font-extrabold
              text-white
              shadow-[0_6px_18px_rgba(3,195,154,0.16)]
              transition-all
              duration-300
              hover:-translate-y-0.5
              hover:bg-primary-dark
              hover:shadow-[0_10px_25px_rgba(3,195,154,0.22)]
            "
          >
            {t("owner.notification.viewAll")}
          </Link>
        </div>
      </aside>
    </>
  );
}