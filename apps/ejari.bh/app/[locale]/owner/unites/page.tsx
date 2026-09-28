import {
  Building2,
  Home,
  Search,
  SlidersHorizontal,
  Plus,
  ArrowLeft,
  ArrowRight,
  MoreHorizontal,
  UserRound,
  CalendarDays,
  Ruler,
  BedDouble,
  Bath,
  CheckCircle2,
  Clock3,
  XCircle,
} from "lucide-react";

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type Props = {
  locale: string;
};

export default async function UnitsPage({ locale }: Props) {
  const t = await getTranslations({ locale });

  /*
   * ============================================================
   * DIRECTION
   * ============================================================
   *
   * Used only for UI direction / icons.
   * All visible text comes from translations.
   */

  const isAr = locale === "ar";
  const BackArrow = isAr ? ArrowRight : ArrowLeft;

  /*
   * ============================================================
   * DEMO DATA
   * ============================================================
   *
   * Replace this later with database/API data.
   */

  const units = [
    {
      id: "101",
      number: "101",
      property: {
        ar: "برج السيف",
        en: "Seef Tower",
      },
      type: {
        ar: "شقة",
        en: "Apartment",
      },
      floor: {
        ar: "الدور الأول",
        en: "1st Floor",
      },
      area: "120",
      bedrooms: 2,
      bathrooms: 2,
      rent: "450",
      tenant: {
        ar: "أحمد محمد",
        en: "Ahmed Mohammed",
      },
      contractExpiry: "31 Aug 2027",
      status: "rented",
    },

    {
      id: "102",
      number: "102",
      property: {
        ar: "برج السيف",
        en: "Seef Tower",
      },
      type: {
        ar: "شقة",
        en: "Apartment",
      },
      floor: {
        ar: "الدور الأول",
        en: "1st Floor",
      },
      area: "135",
      bedrooms: 3,
      bathrooms: 2,
      rent: "500",
      tenant: null,
      contractExpiry: null,
      status: "available",
    },

    {
      id: "203",
      number: "203",
      property: {
        ar: "مجمع المنامة",
        en: "Manama Complex",
      },
      type: {
        ar: "شقة",
        en: "Apartment",
      },
      floor: {
        ar: "الدور الثاني",
        en: "2nd Floor",
      },
      area: "145",
      bedrooms: 3,
      bathrooms: 3,
      rent: "600",
      tenant: {
        ar: "محمد علي",
        en: "Mohammed Ali",
      },
      contractExpiry: "15 Oct 2026",
      status: "expiring",
    },

    {
      id: "204",
      number: "204",
      property: {
        ar: "مجمع المنامة",
        en: "Manama Complex",
      },
      type: {
        ar: "شقة",
        en: "Apartment",
      },
      floor: {
        ar: "الدور الثاني",
        en: "2nd Floor",
      },
      area: "110",
      bedrooms: 2,
      bathrooms: 2,
      rent: "420",
      tenant: {
        ar: "خالد يوسف",
        en: "Khalid Yousif",
      },
      contractExpiry: "20 Mar 2027",
      status: "rented",
    },

    {
      id: "301",
      number: "301",
      property: {
        ar: "مبنى الجفير",
        en: "Juffair Building",
      },
      type: {
        ar: "شقة",
        en: "Apartment",
      },
      floor: {
        ar: "الدور الثالث",
        en: "3rd Floor",
      },
      area: "95",
      bedrooms: 1,
      bathrooms: 1,
      rent: "350",
      tenant: null,
      contractExpiry: null,
      status: "available",
    },

    {
      id: "302",
      number: "302",
      property: {
        ar: "مبنى الجفير",
        en: "Juffair Building",
      },
      type: {
        ar: "مكتب",
        en: "Office",
      },
      floor: {
        ar: "الدور الثالث",
        en: "3rd Floor",
      },
      area: "180",
      bedrooms: 0,
      bathrooms: 1,
      rent: "700",
      tenant: {
        ar: "شركة البحرين",
        en: "Bahrain Company",
      },
      contractExpiry: "05 Sep 2026",
      status: "expiring",
    },
  ];

  /*
   * ============================================================
   * STATISTICS
   * ============================================================
   */

  const totalUnits = units.length;

  const rentedUnits = units.filter(
    (unit) => unit.status === "rented"
  ).length;

  const availableUnits = units.filter(
    (unit) => unit.status === "available"
  ).length;

  const expiringUnits = units.filter(
    (unit) => unit.status === "expiring"
  ).length;

  /*
   * ============================================================
   * STATUS
   * ============================================================
   */

  const getStatus = (status: string) => {
    switch (status) {
      case "rented":
        return {
          label: t("owner.unitsPage.statuses.rented"),
          icon: CheckCircle2,
          className:
            "border-[#03C39A]/15 bg-[#03C39A]/10 text-[#029A7A]",
        };

      case "available":
        return {
          label: t("owner.unitsPage.statuses.available"),
          icon: Home,
          className:
            "border-blue-100 bg-blue-50 text-blue-600",
        };

      case "expiring":
        return {
          label: t("owner.unitsPage.statuses.expiring"),
          icon: Clock3,
          className:
            "border-amber-100 bg-amber-50 text-amber-600",
        };

      default:
        return {
          label: t("owner.unitsPage.statuses.unknown"),
          icon: XCircle,
          className:
            "border-gray-200 bg-gray-100 text-gray-500",
        };
    }
  };

  return (
    <section className="min-h-screen bg-bg-light py-8 lg:py-10">

      <div className="ejari-container">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div
          className="
            flex
            flex-col
            gap-5
            md:flex-row
            md:items-center
            md:justify-between
            animate-[stepReveal_0.6s_ease-out_both]
          "
        >

          <div>

            {/* Breadcrumb */}

            <div className="mb-3 flex items-center gap-2 text-xs font-semibold">

              <Link
                href="/owner"
                className="
                  text-text-muted
                  transition-colors
                  duration-300
                  hover:text-primary
                "
              >
                {t("owner.nav.dashboard")}
              </Link>

              <BackArrow
                size={13}
                className="text-text-muted"
              />

              <span className="text-primary">
                {t("owner.nav.units")}
              </span>

            </div>

            <h1
              className="
                text-2xl
                font-extrabold
                tracking-tight
                text-text-primary
                sm:text-3xl
              "
            >
              {t("owner.nav.units")}
            </h1>

            <p className="mt-2 text-sm leading-7 text-text-secondary">
              {t("owner.unitsPage.description")}
            </p>

          </div>

          {/* Add Unit */}

          <button
            type="button"
            className="
              group
              inline-flex
              h-11
              shrink-0
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-primary
              px-5
              text-sm
              font-bold
              text-white
              shadow-[0_8px_20px_rgba(3,195,154,0.18)]
              transition-all
              duration-300
              hover:-translate-y-0.5
              hover:bg-primary-dark
              hover:shadow-[0_12px_28px_rgba(3,195,154,0.25)]
            "
          >

            <Plus
              size={18}
              strokeWidth={2}
              className="
                transition-transform
                duration-300
                group-hover:rotate-90
              "
            />

            {t("owner.unitsPage.addUnit")}

          </button>

        </div>

        {/* =====================================================
            STATISTICS
        ===================================================== */}

        <div
          className="
            mt-8
            grid
            grid-cols-2
            gap-4
            lg:grid-cols-4
          "
        >

          {/* Total */}

          <div
            className="
              group
              relative
              overflow-hidden
              rounded-2xl
              border
              border-border
              bg-white
              p-5
              shadow-[0_4px_20px_rgba(31,41,55,0.04)]
              transition-all
              duration-300
              hover:-translate-y-1
              hover:shadow-[0_12px_30px_rgba(31,41,55,0.07)]
            "
          >

            <div className="flex items-center justify-between">

              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-xl
                  bg-primary/10
                  text-primary
                  transition-transform
                  duration-300
                  group-hover:scale-110
                "
              >
                <Building2 size={21} />
              </div>

              <span className="text-2xl font-extrabold text-text-primary">
                {totalUnits}
              </span>

            </div>

            <div className="mt-4 text-xs font-semibold text-text-muted">
              {t("owner.unitsPage.totalUnits")}
            </div>

          </div>

          {/* Rented */}

          <div
            className="
              group
              relative
              overflow-hidden
              rounded-2xl
              border
              border-border
              bg-white
              p-5
              shadow-[0_4px_20px_rgba(31,41,55,0.04)]
              transition-all
              duration-300
              hover:-translate-y-1
            "
          >

            <div className="flex items-center justify-between">

              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-xl
                  bg-primary/10
                  text-primary
                  transition-transform
                  duration-300
                  group-hover:scale-110
                "
              >
                <CheckCircle2 size={21} />
              </div>

              <span className="text-2xl font-extrabold text-text-primary">
                {rentedUnits}
              </span>

            </div>

            <div className="mt-4 text-xs font-semibold text-text-muted">
              {t("owner.unitsPage.rentedUnits")}
            </div>

          </div>

          {/* Available */}

          <div
            className="
              group
              relative
              overflow-hidden
              rounded-2xl
              border
              border-border
              bg-white
              p-5
              shadow-[0_4px_20px_rgba(31,41,55,0.04)]
              transition-all
              duration-300
              hover:-translate-y-1
            "
          >

            <div className="flex items-center justify-between">

              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-xl
                  bg-blue-50
                  text-blue-600
                  transition-transform
                  duration-300
                  group-hover:scale-110
                "
              >
                <Home size={21} />
              </div>

              <span className="text-2xl font-extrabold text-text-primary">
                {availableUnits}
              </span>

            </div>

            <div className="mt-4 text-xs font-semibold text-text-muted">
              {t("owner.unitsPage.availableUnits")}
            </div>

          </div>

          {/* Expiring */}

          <div
            className="
              group
              relative
              overflow-hidden
              rounded-2xl
              border
              border-border
              bg-white
              p-5
              shadow-[0_4px_20px_rgba(31,41,55,0.04)]
              transition-all
              duration-300
              hover:-translate-y-1
            "
          >

            <div className="flex items-center justify-between">

              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-xl
                  bg-amber-50
                  text-amber-500
                  transition-transform
                  duration-300
                  group-hover:scale-110
                "
              >
                <Clock3 size={21} />
              </div>

              <span className="text-2xl font-extrabold text-text-primary">
                {expiringUnits}
              </span>

            </div>

            <div className="mt-4 text-xs font-semibold text-text-muted">
              {t("owner.unitsPage.expiringSoon")}
            </div>

          </div>

        </div>

        {/* =====================================================
            SEARCH / FILTERS
        ===================================================== */}

        <div
          className="
            mt-8
            rounded-2xl
            border
            border-border
            bg-white
            p-4
            shadow-[0_4px_20px_rgba(31,41,55,0.04)]
          "
        >

          <div
            className="
              flex
              flex-col
              gap-3
              lg:flex-row
              lg:items-center
            "
          >

            {/* Search */}

            <div className="relative flex-1">

              <Search
                size={18}
                className="
                  pointer-events-none
                  absolute
                  top-1/2
                  -translate-y-1/2
                  text-text-muted
                  ltr:left-4
                  rtl:right-4
                "
              />

              <input
                type="text"
                placeholder={t("owner.unitsPage.search")}
                className="
                  h-11
                  w-full
                  rounded-xl
                  border
                  border-border
                  bg-bg-light
                  px-11
                  text-sm
                  text-text-primary
                  outline-none
                  transition-all
                  duration-300
                  placeholder:text-text-muted
                  focus:border-primary/40
                  focus:bg-white
                  focus:ring-4
                  focus:ring-primary/5
                "
              />

            </div>

            {/* Property Filter */}

            <button
              type="button"
              className="
                flex
                h-11
                items-center
                justify-between
                gap-5
                rounded-xl
                border
                border-border
                bg-white
                px-4
                text-sm
                font-semibold
                text-text-secondary
                transition-all
                duration-300
                hover:border-primary/30
                hover:bg-primary/[0.02]
                hover:text-primary
                lg:min-w-[190px]
              "
            >

              <span>
                {t("owner.unitsPage.allProperties")}
              </span>

              <SlidersHorizontal size={16} />

            </button>

            {/* Status Filter */}

            <button
              type="button"
              className="
                flex
                h-11
                items-center
                justify-between
                gap-5
                rounded-xl
                border
                border-border
                bg-white
                px-4
                text-sm
                font-semibold
                text-text-secondary
                transition-all
                duration-300
                hover:border-primary/30
                hover:bg-primary/[0.02]
                hover:text-primary
                lg:min-w-[170px]
              "
            >

              <span>
                {t("owner.unitsPage.allStatuses")}
              </span>

              <SlidersHorizontal size={16} />

            </button>

          </div>

        </div>

        {/* =====================================================
            LIST HEADER
        ===================================================== */}

        <div className="mt-8 flex items-center justify-between">

          <div>

            <h2 className="text-base font-extrabold text-text-primary">
              {t("owner.unitsPage.allUnits")}
            </h2>

            <p className="mt-1 text-xs text-text-muted">
              {totalUnits} {t("owner.unitsPage.registeredUnits")}
            </p>

          </div>

        </div>

        {/* =====================================================
            DESKTOP TABLE
        ===================================================== */}

        <div
          className="
            mt-4
            hidden
            overflow-hidden
            rounded-2xl
            border
            border-border
            bg-white
            shadow-[0_4px_20px_rgba(31,41,55,0.04)]
            lg:block
          "
        >

          {/* Table Header */}

          <div
            className="
              grid
              grid-cols-[0.8fr_1.4fr_1fr_0.8fr_1.2fr_1fr_45px]
              items-center
              border-b
              border-border
              bg-bg-light
              px-5
              py-4
              text-[11px]
              font-bold
              text-text-muted
            "
          >

            <div>
              {t("owner.unitsPage.unit")}
            </div>

            <div>
              {t("owner.unitsPage.property")}
            </div>

            <div>
              {t("owner.unitsPage.type")}
            </div>

            <div>
              {t("owner.unitsPage.rent")}
            </div>

            <div>
              {t("owner.unitsPage.tenant")}
            </div>

            <div>
              {t("owner.unitsPage.status")}
            </div>

            <div />

          </div>

          {/* Rows */}

          {units.map((unit, index) => {

            const status = getStatus(unit.status);
            const StatusIcon = status.icon;

            return (
              <Link
                key={unit.id}
                href={`/owner/properties/unites/${unit.id}`}
                className="
                  group
                  grid
                  grid-cols-[0.8fr_1.4fr_1fr_0.8fr_1.2fr_1fr_45px]
                  items-center
                  border-b
                  border-border
                  px-5
                  py-5
                  last:border-b-0
                  transition-all
                  duration-300
                  hover:bg-primary/[0.025]
                  animate-[stepReveal_0.5s_ease-out_both]
                "
                style={{
                  animationDelay: `${index * 70}ms`,
                }}
              >

                {/* Unit */}

                <div>

                  <div
                    className="
                      flex
                      h-10
                      w-10
                      items-center
                      justify-center
                      rounded-xl
                      bg-primary/10
                      text-xs
                      font-extrabold
                      text-primary
                      transition-all
                      duration-300
                      group-hover:bg-primary
                      group-hover:text-white
                      group-hover:scale-105
                    "
                  >
                    {unit.number}
                  </div>

                </div>

                {/* Property */}

                <div>

                  <div className="text-sm font-bold text-text-primary">
                    {unit.property[locale === "ar" ? "ar" : "en"]}
                  </div>

                  <div className="mt-1 flex items-center gap-1 text-[10px] text-text-muted">

                    <Building2 size={12} />

                    {unit.floor[locale === "ar" ? "ar" : "en"]}

                  </div>

                </div>

                {/* Type */}

                <div className="text-xs font-semibold text-text-secondary">
                  {unit.type[locale === "ar" ? "ar" : "en"]}
                </div>

                {/* Rent */}

                <div>

                  <span className="text-sm font-extrabold text-text-primary">
                    {unit.rent}
                  </span>

                  <span className="ms-1 text-[10px] text-text-muted">
                    BD
                  </span>

                </div>

                {/* Tenant */}

                <div>

                  {unit.tenant ? (
                    <div className="flex items-center gap-2">

                      <div
                        className="
                          flex
                          h-8
                          w-8
                          shrink-0
                          items-center
                          justify-center
                          rounded-full
                          bg-bg-light
                          text-text-muted
                        "
                      >
                        <UserRound size={14} />
                      </div>

                      <span className="max-w-[120px] truncate text-xs font-semibold text-text-secondary">
                        {unit.tenant[
                          locale === "ar" ? "ar" : "en"
                        ]}
                      </span>

                    </div>
                  ) : (
                    <span className="text-xs text-text-muted">
                      {t("owner.unitsPage.none")}
                    </span>
                  )}

                </div>

                {/* Status */}

                <div>

                  <span
                    className={`
                      inline-flex
                      items-center
                      gap-1.5
                      rounded-full
                      border
                      px-2.5
                      py-1.5
                      text-[10px]
                      font-bold
                      ${status.className}
                    `}
                  >

                    <StatusIcon size={12} />

                    {status.label}

                  </span>

                </div>

                {/* More */}

                <div
                  className="
                    flex
                    h-8
                    w-8
                    items-center
                    justify-center
                    rounded-lg
                    text-text-muted
                    transition-all
                    duration-300
                    group-hover:bg-primary/10
                    group-hover:text-primary
                  "
                >
                  <MoreHorizontal size={17} />
                </div>

              </Link>
            );
          })}

        </div>

        {/* =====================================================
            MOBILE CARDS
        ===================================================== */}

        <div className="mt-4 grid gap-4 lg:hidden">

          {units.map((unit, index) => {

            const status = getStatus(unit.status);
            const StatusIcon = status.icon;

            return (
              <Link
                key={unit.id}
                href={`/owner/properties/unites/${unit.id}`}
                className="
                  group
                  relative
                  overflow-hidden
                  rounded-2xl
                  border
                  border-border
                  bg-white
                  p-5
                  shadow-[0_4px_20px_rgba(31,41,55,0.04)]
                  transition-all
                  duration-300
                  hover:-translate-y-1
                  hover:border-primary/20
                  hover:shadow-[0_12px_30px_rgba(3,195,154,0.08)]
                  animate-[stepReveal_0.5s_ease-out_both]
                "
                style={{
                  animationDelay: `${index * 70}ms`,
                }}
              >

                {/* Bottom accent */}

                <div
                  className="
                    pointer-events-none
                    absolute
                    bottom-0
                    start-0
                    h-1
                    w-0
                    bg-primary
                    transition-all
                    duration-500
                    group-hover:w-full
                  "
                />

                {/* Header */}

                <div className="flex items-start justify-between gap-4">

                  <div className="flex items-center gap-3">

                    <div
                      className="
                        flex
                        h-12
                        w-12
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-primary/10
                        text-sm
                        font-extrabold
                        text-primary
                        transition-all
                        duration-300
                        group-hover:bg-primary
                        group-hover:text-white
                      "
                    >
                      {unit.number}
                    </div>

                    <div>

                      <h3 className="text-sm font-extrabold text-text-primary">
                        {unit.property[
                          locale === "ar" ? "ar" : "en"
                        ]}
                      </h3>

                      <div className="mt-1 text-[10px] text-text-muted">

                        {unit.type[
                          locale === "ar" ? "ar" : "en"
                        ]}

                        {" • "}

                        {unit.floor[
                          locale === "ar" ? "ar" : "en"
                        ]}

                      </div>

                    </div>

                  </div>

                  <span
                    className={`
                      inline-flex
                      shrink-0
                      items-center
                      gap-1
                      rounded-full
                      border
                      px-2
                      py-1
                      text-[9px]
                      font-bold
                      ${status.className}
                    `}
                  >

                    <StatusIcon size={11} />

                    {status.label}

                  </span>

                </div>

                {/* Details */}

                <div className="mt-5 grid grid-cols-2 gap-3">

                  {/* Area */}

                  <div className="rounded-xl bg-bg-light p-3">

                    <div className="flex items-center gap-1.5 text-[10px] text-text-muted">

                      <Ruler size={12} />

                      {t("owner.unitsPage.area")}

                    </div>

                    <div className="mt-1 text-xs font-bold text-text-primary">
                      {unit.area} m²
                    </div>

                  </div>

                  {/* Rent */}

                  <div className="rounded-xl bg-bg-light p-3">

                    <div className="text-[10px] text-text-muted">
                      {t("owner.unitsPage.monthlyRent")}
                    </div>

                    <div className="mt-1 text-xs font-bold text-text-primary">
                      {unit.rent} BD
                    </div>

                  </div>

                  {/* Bedrooms */}

                  <div className="rounded-xl bg-bg-light p-3">

                    <div className="flex items-center gap-1.5 text-[10px] text-text-muted">

                      <BedDouble size={12} />

                      {t("owner.unitsPage.bedrooms")}

                    </div>

                    <div className="mt-1 text-xs font-bold text-text-primary">
                      {unit.bedrooms || "—"}
                    </div>

                  </div>

                  {/* Bathrooms */}

                  <div className="rounded-xl bg-bg-light p-3">

                    <div className="flex items-center gap-1.5 text-[10px] text-text-muted">

                      <Bath size={12} />

                      {t("owner.unitsPage.bathrooms")}

                    </div>

                    <div className="mt-1 text-xs font-bold text-text-primary">
                      {unit.bathrooms}
                    </div>

                  </div>

                </div>

                {/* Tenant / Contract */}

                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">

                  <div className="flex min-w-0 items-center gap-2">

                    <div
                      className="
                        flex
                        h-8
                        w-8
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        bg-bg-light
                        text-text-muted
                      "
                    >
                      <UserRound size={14} />
                    </div>

                    <div className="min-w-0">

                      <div className="text-[9px] text-text-muted">
                        {t("owner.unitsPage.tenant")}
                      </div>

                      <div className="truncate text-xs font-bold text-text-secondary">

                        {unit.tenant
                          ? unit.tenant[
                              locale === "ar" ? "ar" : "en"
                            ]
                          : t("owner.unitsPage.unitAvailable")}

                      </div>

                    </div>

                  </div>

                  {unit.contractExpiry && (
                    <div className="text-end">

                      <div className="flex items-center justify-end gap-1 text-[9px] text-text-muted">

                        <CalendarDays size={11} />

                        {t("owner.unitsPage.contractExpiry")}

                      </div>

                      <div className="mt-1 text-[10px] font-bold text-text-secondary">
                        {unit.contractExpiry}
                      </div>

                    </div>
                  )}

                </div>

              </Link>
            );
          })}

        </div>

      </div>

    </section>
  );
}