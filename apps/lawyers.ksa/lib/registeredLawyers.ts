// Canonical list of lawyers registered on the Lawyers.bh platform.
// Arabic names below are transliterations based on the English roster.
// Replace any Arabic name with the official Arabic spelling when available.
export type LawyerSpecialty =
  | "criminal"
  | "civil"
  | "sharia"
  | "commercial"
  | "constitutional";

export type LawyerBadgeType = "registered" | "premium";

export type RegisteredLawyer = {
  nameEn: string;
  nameAr: string;
  rating: number;
  specialties: LawyerSpecialty[];
  badgeType?: LawyerBadgeType;
  image?: string;
    subtitleAr?: string;
  subtitleEn?: string;
};

export const SPECIALTY_LABELS: Record<
  LawyerSpecialty,
  { en: string; ar: string }
> = {
  criminal: { en: "Criminal", ar: "جنائي" },
  civil: { en: "Civil", ar: "مدني" },
  sharia: { en: "Sharia", ar: "شرعي" },
  commercial: { en: "Commercial", ar: "تجاري" },
  constitutional: { en: "Constitutional", ar: "دستوري" },
};

export const REGISTERED_LAWYERS: RegisteredLawyer[] = [
  { nameEn: "Abdulla Albuti", nameAr: "عبدالله البطي" , rating: 0,
    image :"/images/lawyers/Abdulla-Albuti.png",
subtitleAr: "محامي أمام محكمة التمييز",
subtitleEn: "Lawyer before the Court of Cassation",
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "premium", },
  { nameEn: "Abduljalil Alkhunaizi", nameAr: "عبدالجليل الخنيزي" ,
    image :"/images/lawyers/Abduljalil2.jpeg",
    rating: 0,
    subtitleAr: "محامي أمام محكمة التمييز",
subtitleEn: "Lawyer before the Court of Cassation",
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered", },
  
  { nameEn: "Abdulla Groof", nameAr: "عبدالله غروف" , rating: 0,
    image :"/images/lawyers/Abdulla-Groof.jpeg",
    subtitleAr: "محامي أمام محكمة التمييز",
subtitleEn: "Lawyer before the Court of Cassation",
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered", },
  { nameEn: "Abdullah AlHaddad", nameAr: "عبدالله الحداد" , rating: 0,
     image :"/images/lawyers/cropped_circle_image.png",
     subtitleAr: "محامي أمام محكمة التمييز",
subtitleEn: "Lawyer before the Court of Cassation",
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered", },
  { nameEn: "Ahad Alduwaihi", nameAr: "عهد الدويهي" , rating: 0,
    image :"/images/lawyers/Ahad-Alduwaihi.jpeg",
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered",
  subtitleAr: "محامي أمام محكمة التمييز",
subtitleEn: "Lawyer before the Court of Cassation", },

  { nameEn: "Ahmed AlKobaisi", nameAr: "أحمد الكبيسي" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered", 
  image :"/images/lawyers/Ahmed-AlKobaisi.jpeg",
  subtitleAr: "محامي أمام محكمة التمييز",
subtitleEn: "Lawyer before the Court of Cassation",
},
    
  { nameEn: "Ahmed AlTamimi", nameAr: "أحمد التميمي" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered",
    image :"/images/lawyers/Ahmed-Altamimi.jpg",
  subtitleAr: "محامي أمام محكمة التمييز",
subtitleEn: "Lawyer before the Court of Cassation", },
  { nameEn: "Ahmed Rafia", nameAr: "أحمد رفيع" , rating: 0,
    image :"/images/lawyers/Ahmed-Rafia.jpg",
    subtitleAr: "محامي أمام محكمة التمييز",
subtitleEn: "Lawyer before the Court of Cassation",
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered", },
  { nameEn: "Alya Alzeera", nameAr: "عليا الزيرة" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered", 
  image :"/images/lawyers/Alya-Alzeera.png",},
  { nameEn: "Ammar Abdulaziz", nameAr: "عمار عبدالعزيز" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered",
  image :"/images/lawyers/Ammar-Abdulaziz.jpeg", },
  { nameEn: "Amnah Alawadhi", nameAr: "آمنة العوضي" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered", },
  { nameEn: "Ayesha Sharida", nameAr: "عائشة شريدة" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"], badgeType: "registered",
  image :"/images/lawyers/Ayesha-Sharida.jpeg",},
  { nameEn: "Aysha Thani", nameAr: "عائشة ثاني" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered", },
  { nameEn: "Baqer Aqeel", nameAr: "باقر عقيل" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered", },
  { nameEn: "Batool Abdulameer", nameAr: "بتول عبدالأمير" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered",},

  { nameEn: "Bushra Alnajjar", nameAr: "بشرى النجار" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered", },
  { nameEn: "Dana Awadhallah", nameAr: "دانا عوض الله" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered",},
  { nameEn: "Dr. Jamal Kamal", nameAr: "د. جمال كمال", rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered", },
  { nameEn: "Ebtesam Alaiban", nameAr: "ابتسام العيبان", rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered", },
  { nameEn: "Fadeela Alsameea", nameAr: "فضيلة السميع", rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered", },

  { nameEn: "Fatima Alhoori", nameAr: "فاطمة الحوري", rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"], badgeType: "registered",},
  { nameEn: "Fatima Althuwaini", nameAr: "فاطمة الثويني" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered",},
  { nameEn: "Fatma Aman", nameAr: "فاطمة أمان" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered", },
  { nameEn: "Gadeer Mohammed", nameAr: "غدير محمد" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered", },
  { nameEn: "Hameed Alsammak", nameAr: "حميد السماك" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered", },

  { nameEn: "Hanan Almeshawi", nameAr: "حنان المشاوي" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"], badgeType: "registered",},
  { nameEn: "Hanan AlRadhi", nameAr: "حنان الراضي" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered", },
  { nameEn: "Hawra Alsayegh", nameAr: "حوراء الصايغ" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered", },
  { nameEn: "Heyam Isa", nameAr: "هيام عيسى" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered", },
  { nameEn: "Hussain Jabbari", nameAr: "حسين جباري" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered", },

  { nameEn: "Hussain Jawad", nameAr: "حسين جواد" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered", },
  { nameEn: "Hussein Alasfoor", nameAr: "حسين العصفور" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered", },
  { nameEn: "Hussein Alkaabi", nameAr: "حسين الكعبي" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"], badgeType: "registered",},
  { nameEn: "Jaffer Alsamaheeji", nameAr: "جعفر السماهيجي" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"], badgeType: "registered",},
  { nameEn: "Jasim Alessa", nameAr: "جاسم العيسى" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"], badgeType: "registered",},

  { nameEn: "Khaled Alzayayni", nameAr: "خالد الزياني" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "premium", },
  { nameEn: "Maram Husain", nameAr: "مرام حسين" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered", },
  { nameEn: "Mariam Alshaikh", nameAr: "مريم الشيخ" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"], badgeType: "registered",},
  { nameEn: "Mohamed Alkawari", nameAr: "محمد الكواري" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered",},
  { nameEn: "Mohamed Alkhudair", nameAr: "محمد الخضير" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "premium", },

  { nameEn: "Mohammad Alkhaja", nameAr: "محمد الخاجة" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered", },
  { nameEn: "Mohammed Hassani", nameAr: "محمد حسني" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered", },
  { nameEn: "Mostafa Aldesouki", nameAr: "مصطفى الدسوقي" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered", },
  { nameEn: "Noura AlQallaf", nameAr: "نورة القلاف", rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered", },
  { nameEn: "Omar Alomar", nameAr: "عمر العمر" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered",},

  { nameEn: "Rashed Ateeq", nameAr: "راشد عتيق" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "premium", },
  { nameEn: "Saeed Jaffer", nameAr: "سعيد جعفر" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"], badgeType: "registered",},
  { nameEn: "Sara Alfadhli", nameAr: "سارة الفضلي" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered", },
  { nameEn: "Sara Alzubari", nameAr: "سارة الزباري" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"], badgeType: "registered",},
  { nameEn: "Sara Jawad", nameAr: "سارة جواد" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"], badgeType: "registered",},

  { nameEn: "Sarah Ashoor", nameAr: "سارة عاشور" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered", },
  { nameEn: "Sayed Majtaba Alaradi", nameAr: "سيد مجتبى العرادي" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"], badgeType: "registered",},
  { nameEn: "Sayed Yousuf Alhashimi", nameAr: "سيد يوسف الهاشمي" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered", },
  { nameEn: "Seema Abdulkarim", nameAr: "سيمة عبدالكريم" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered", },
  { nameEn: "Suha Alkhazragi", nameAr: "سهى الخزرجي" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"], badgeType: "registered",},

  { nameEn: "Taha Alqaidoom", nameAr: "طه القيدوم" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered", },
  { nameEn: "Taiba Aljamry", nameAr: "طيبة الجمري" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"], badgeType: "registered",},
  { nameEn: "Wajeeha Ahmed", nameAr: "وجيهة أحمد" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"], badgeType: "registered",},
  { nameEn: "Wejdan Abdulqadir", nameAr: "وجدان عبدالقادر" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered", },
  { nameEn: "Yasmeen Ahmed", nameAr: "ياسمين أحمد" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "premium", },

  { nameEn: "Zahera Almerri", nameAr: "زاهرة المري" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered",},
  { nameEn: "Zahra Alhoori", nameAr: "زهراء الحوري" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered", },
  { nameEn: "Zahra Saleh", nameAr: "زهراء صالح" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"],badgeType: "registered", },
  { nameEn: "Zainab Almughani", nameAr: "زينب المغني" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"], badgeType: "registered",},
  { nameEn: "Zainab S Taleb", nameAr: "زينب س. طالب" , rating: 0,
    specialties: ["sharia","civil", "commercial","criminal","constitutional"], badgeType: "registered",},
];

const NORMALISED = new Set(
  REGISTERED_LAWYERS.flatMap((lawyer) => [
    lawyer.nameEn.trim().toLowerCase(),
    lawyer.nameAr.trim().toLowerCase(),
  ])
);

/** Case-insensitive membership check used to gate the agreement First Party. */
export function isRegisteredLawyer(name: string): boolean {
  return NORMALISED.has(name.trim().toLowerCase());
}

export function getRegisteredLawyerName(
  lawyer: RegisteredLawyer,
  locale: "ar" | "en"
): string {
  return locale === "ar" ? lawyer.nameAr : lawyer.nameEn;
}