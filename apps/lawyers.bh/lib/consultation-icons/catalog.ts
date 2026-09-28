import {
  Building2,
  CalendarDays,
  CircleHelp,
  FileText,
  Headphones,
  House,
  MapPin,
  MessageCircle,
  MessagesSquare,
  MonitorSmartphone,
  Phone,
  Scale,
  ShieldCheck,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";

const icons = {
  phone: { icon: Phone, ar: "هاتف", en: "Phone" },
  "message-circle": { icon: MessageCircle, ar: "محادثة", en: "Chat" },
  "messages-square": { icon: MessagesSquare, ar: "رسائل", en: "Messages" },
  video: { icon: Video, ar: "فيديو", en: "Video" },
  "monitor-smartphone": { icon: MonitorSmartphone, ar: "اتصال إلكتروني", en: "Online call" },
  "map-pin": { icon: MapPin, ar: "موقع", en: "Location" },
  "building-2": { icon: Building2, ar: "مكتب", en: "Office" },
  house: { icon: House, ar: "منزل", en: "Home" },
  home: { icon: House, ar: "منزل", en: "Home" },
  headphones: { icon: Headphones, ar: "سماعة", en: "Headset" },
  calendar: { icon: CalendarDays, ar: "موعد", en: "Calendar" },
  scale: { icon: Scale, ar: "ميزان العدالة", en: "Legal scale" },
  "shield-check": { icon: ShieldCheck, ar: "حماية", en: "Protection" },
  "file-text": { icon: FileText, ar: "مستند", en: "Document" },
  users: { icon: Users, ar: "اجتماع", en: "Meeting" },
} as const satisfies Record<string, { icon: LucideIcon; ar: string; en: string }>;

export type ConsultationIconKey = keyof typeof icons;
export const CONSULTATION_ICON_KEYS = Object.keys(icons) as ConsultationIconKey[];

export function isConsultationIconKey(value: string): value is ConsultationIconKey {
  return Object.prototype.hasOwnProperty.call(icons, value);
}

export function getConsultationIcon(value: string): LucideIcon {
  return isConsultationIconKey(value) ? icons[value].icon : CircleHelp;
}

export function getConsultationIconLabel(value: ConsultationIconKey, locale: "ar" | "en") {
  return icons[value][locale];
}
