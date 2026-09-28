"use client";

import { motion } from "framer-motion";
import { Phone, Shield, AlertTriangle } from "lucide-react";
import { useLocale } from "next-intl";

const hotlines = {
  en: [
    { label: "Emergency", number: "999" },
    { label: "Traffic & Accidents", number: "199" },
    { label: "Anti-Corruption", number: "992" },
    { label: "Drug Enforcement", number: "996" },
    { label: "Complaints", number: "80008008" },
  ],
  ar: [
    { label: "الطوارئ", number: "999" },
    { label: "المرور والحوادث", number: "199" },
    { label: "مكافحة الفساد", number: "992" },
    { label: "مكافحة المخدرات", number: "996" },
    { label: "الشكاوى", number: "80008008" },
  ],
};

const departments = {
  en: [
    { name: "Security Media Center", phone: "17390900" },
    { name: "General Directorate of Traffic", phone: "17845777" },
    { name: "Nationality, Passports & Residence", phone: "17399777" },
    { name: "Civil Defense", phone: "17239300" },
    { name: "Coast Guard", phone: "17700000" },
    { name: "Criminal Investigation", phone: "17718888" },
    { name: "Juvenile Care", phone: "17681043" },
    { name: "Women Police", phone: "17870302" },
    { name: "Customs", phone: "17359666" },
    { name: "Airport Police", phone: "17330515" },
    { name: "King Fahd Causeway", phone: "17796555" },
    { name: "Marine Ports", phone: "17673442" },
  ],
  ar: [
    { name: "مركز الإعلام الأمني", phone: "17390900" },
    { name: "الإدارة العامة للمرور", phone: "17845777" },
    { name: "الجنسية والجوازات والإقامة", phone: "17399777" },
    { name: "الدفاع المدني", phone: "17239300" },
    { name: "خفر السواحل", phone: "17700000" },
    { name: "إدارة المباحث الجنائية", phone: "17718888" },
    { name: "رعاية الأحداث", phone: "17681043" },
    { name: "شرطة المرأة", phone: "17870302" },
    { name: "الجمارك", phone: "17359666" },
    { name: "شرطة المطار", phone: "17330515" },
    { name: "جسر الملك فهد", phone: "17796555" },
    { name: "الموانئ البحرية", phone: "17673442" },
  ],
};

const governorates = {
  en: [
    {
      name: "Capital Governorate",
      phone: "17744444",
      mainStation: "17291555",
      stations: ["Al-Na'eem", "Exhibition Grounds", "Nabih Saleh", "Um Al-Hassam", "Bab Al Bahrain", "Khamis B", "Al-Qudaibiya", "Sitra", "South Capital"],
    },
    {
      name: "Muharraq Governorate",
      phone: "17343700",
      mainStation: "17337022",
      stations: ["Al-Hala", "Al-Hidd", "Samahij"],
    },
    {
      name: "Northern Governorate",
      phone: "17795555",
      mainStation: "17430300",
      stations: ["Northern Hamad Town", "Southern Hamad Town", "Al-Budaiya", "Khamis A"],
    },
    {
      name: "Southern Governorate",
      phone: "17750000",
      mainStation: "17664606",
      stations: ["Isa Town", "East Riffa", "Zallaq", "Al-Durra"],
    },
  ],
  ar: [
    {
      name: "محافظة العاصمة",
      phone: "17744444",
      mainStation: "17291555",
      stations: ["النعيم", "أرض المعارض", "نبيه صالح", "أم الحصم", "باب البحرين", "خميس ب", "القضيبية", "سترة", "جنوب العاصمة"],
    },
    {
      name: "محافظة المحرق",
      phone: "17343700",
      mainStation: "17337022",
      stations: ["الحالة", "الحد", "سماهيج"],
    },
    {
      name: "المحافظة الشمالية",
      phone: "17795555",
      mainStation: "17430300",
      stations: ["شمال مدينة حمد", "جنوب مدينة حمد", "البديع", "خميس أ"],
    },
    {
      name: "المحافظة الجنوبية",
      phone: "17750000",
      mainStation: "17664606",
      stations: ["مدينة عيسى", "شرق الرفاع", "الزلاق", "الدرة"],
    },
  ],
};

export default function PoliceDirectoryPage() {
  const isAr = useLocale() === "ar";
  const h = isAr ? hotlines.ar : hotlines.en;
  const d = isAr ? departments.ar : departments.en;
  const g = isAr ? governorates.ar : governorates.en;

  return (
    <div className="py-16 lg:py-24">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary mb-2">
            {isAr ? "دليل مراكز الشرطة" : "Police Stations Directory"}
          </h1>
          <p className="text-text-muted">
            {isAr ? "مملكة البحرين - أرقام الشرطة والطوارئ" : "Kingdom of Bahrain - Police & Emergency Numbers"}
          </p>
        </motion.div>

        {/* Hotlines */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-10">
          <h2 className="flex items-center gap-2 text-xl font-bold text-text-primary mb-4">
            <AlertTriangle className="w-5 h-5 text-primary" />
            {isAr ? "أرقام الطوارئ" : "Emergency Hotlines"}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {h.map((item) => (
              <a key={item.number} href={`tel:${item.number}`} className="bg-primary/[0.04] border border-primary/10 rounded-lg p-4 text-center hover:bg-primary/[0.08] transition-colors">
                <div className="text-2xl font-extrabold text-primary">{item.number}</div>
                <div className="text-xs text-text-muted mt-1">{item.label}</div>
              </a>
            ))}
          </div>
        </motion.div>

        {/* Departments */}
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-10">
          <h2 className="flex items-center gap-2 text-xl font-bold text-text-primary mb-4">
            <Shield className="w-5 h-5 text-primary" />
            {isAr ? "الإدارات والأقسام" : "Departments"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {d.map((item) => (
              <a key={item.phone} href={`tel:${item.phone}`} className="flex items-center justify-between gap-3 p-4 rounded-lg border border-gray-100 bg-white hover:border-primary/20 transition-colors">
                <span className="text-sm font-medium text-text-primary">{item.name}</span>
                <span className="flex items-center gap-1 text-sm text-primary font-semibold whitespace-nowrap">
                  <Phone size={12} /> {item.phone}
                </span>
              </a>
            ))}
          </div>
        </motion.div>

        {/* Governorates */}
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-xl font-bold text-text-primary mb-6">
            {isAr ? "المحافظات" : "Governorates"}
          </h2>
          <div className="space-y-6">
            {g.map((gov) => (
              <div key={gov.name} className="rounded-xl border border-gray-100 overflow-hidden">
                <div className="bg-bg-dark p-4 flex items-center justify-between">
                  <h3 className="font-bold text-white">{gov.name}</h3>
                  <div className="flex items-center gap-4 text-sm">
                    <a href={`tel:${gov.phone}`} className="text-primary-light flex items-center gap-1">
                      <Phone size={12} /> {gov.phone}
                    </a>
                    <a href={`tel:${gov.mainStation}`} className="text-white/60 flex items-center gap-1">
                      <Phone size={12} /> {gov.mainStation}
                    </a>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {gov.stations.map((s) => (
                      <span key={s} className="px-3 py-1.5 bg-bg-light rounded-md text-sm text-text-secondary">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
