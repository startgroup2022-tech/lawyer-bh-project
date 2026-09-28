"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import {
  Target,
  Eye,
  BookOpen,
  Users,
  User,
  Flag,
  Compass,
  CheckCircle2,
  Briefcase,
  Building2,
  Award,
  ListChecks,
} from "lucide-react";
import { useLocale } from "next-intl";
import { execSections, getMemberSlug } from "./team-data";

const execLegalClause = {
  en: "The members of the administrative, organisational and executive structure operate in accordance with the approved statutory frameworks and cooperation agreements. All work is subject to the direct supervision of the CEO, in order to achieve the highest levels of governance and professionalism.",
  ar: "يعمل أعضاء الهيكل الإداري والتنظيمي والتنفيذي وفق الأطر النظامية المعتمدة واتفاقيات التعاون، وتخضع جميع الأعمال للإشراف المباشر من الرئيس التنفيذي، بما يحقق أعلى درجات الحوكمة والاحترافية.",
};

const content = {
  en: {
    title: "About Bahrain Lawyers Platform",
    subtitle: "Saudi Lawyers",
    intro: "Saudi Lawyers is an online brokerage platform registered in the Kingdom of Bahrain. It is not a law firm and does not provide legal services. Rather, legal services are provided by a group of lawyers, private notaries, private executors, and professional offices — including individuals, institutions and companies licensed by the Ministry of Justice, Islamic Affairs and Endowments, the Ministry of Industry, Commerce and Tourism, and the eGovernment Authority in the Kingdom of Bahrain — all registered as providers and service providers on the platform.",
    missionTitle: "Our Mission",
    mission: "We are committed to advancing legal culture and empowering individuals and institutions to access their rights with ease and clarity — through innovative, trusted legal services and by connecting beneficiaries with qualified legal expertise, strengthening trust in the justice system and raising the quality of legal services in the Kingdom.",
    visionTitle: "Our Vision",
    vision: "To be the leading legal platform in the Kingdom of Bahrain — supporting the achievement of justice and the rule of law and contributing to building a legally aware society, in line with the principles of competitiveness, sustainability and transparency under Bahrain Vision 2030.",
    objectivesTitle: "Strategic Objectives",
    objectives: [
      "Spread legal awareness to support a society more conscious of its rights and obligations.",
      "Facilitate access to legal services efficiently and fairly across all segments of society.",
      "Strengthen transparency and credibility in delivering legal services and consultations.",
      "Support digital transformation in the legal sector in line with modern developments.",
      "Build a strong professional network of lawyers and legal consultants to the highest standards.",
      "Contribute to raising the competitiveness of the legal sector locally and regionally.",
    ],
    strategyTitle: "Our Strategy",
    strategy: [
      "Develop an integrated digital platform that connects beneficiaries with lawyers effectively and easily.",
      "Adopt best practices in legal service quality and enhance the user experience.",
      "Forge partnerships with public and private bodies to support integration of legal services.",
      "Invest in legal innovation and modern technologies (LegalTech).",
      "Run continuous awareness and educational programs that support sustainable development goals.",
      "Embed governance and transparency principles across all operations and services.",
    ],
    definitionsTitle: "Definitions",
    definitions: [
      { term: "Platform", desc: "Saudi Lawyers electronic mediation platform" },
      { term: "Application", desc: "Any application available on smart devices designated for the platform" },
      { term: "Beneficiary", desc: "Every natural or legal person who uses the platform to obtain any service" },
      { term: "Lawyer", desc: "Every natural or legal person licensed to practice the profession of law by the Ministry of Justice" },
      { term: "Company Owner", desc: "Saraya Square Foundation for Services Business, Commercial Registration No. 96375-5" },
      { term: "Administration", desc: "Gulf International Collection & Consulting W.L.L, Commercial Registration No. 1-78695" },
    ],
    provisionsTitle: "General Provisions",
    provisions: [
      "These terms apply to the use of the platform regardless of the method of access, whether through the website or mobile applications.",
      "The platform is not responsible for any agreements concluded between clients and lawyers outside the scope of the platform.",
      "The judicial authority for any disputes arising from the use of this platform shall be the courts of the Kingdom of Bahrain.",
      "The platform reserves the right to modify these terms at any time. Continued use constitutes acceptance of the modified terms.",
    ],
    bioLabels: {
      previousExperience: " Experience",
      yearsOfExperience: "Years of Experience",
      previousEmployer: "Previous Employer",
      experience: "Experience",
      currentTasks: "Current Tasks",
    },
    officialStatementTitle: "Official Statement",
  },
  ar: {
    title: "عن منصة محامون السعودية",
    subtitle: "Saudi Lawyers",
    intro: "محامون السعودية هي منصة وساطة إلكترونية مسجلة في مملكة البحرين. وهي ليست مكتب محاماة ولا تقدم خدمات قانونية. بل يتم تقديم الخدمات القانونية من قبل مجموعة من المحامين وكتاب العدل الخاصين (الموثقين الخاصين)، والمنفذين الخاصين والمكاتب المحترفة من أفراد ومؤسسات وشركات المرخصين من وزارة العدل والشؤون الإسلامية والأوقاف، ووزارة الصناعة والتجارة والسياحة والحكومة الإلكترونية في مملكة البحرين، ومسجلين كمزودي ومقدمي خدمات على المنصة.",
    missionTitle: "رسالتنا",
    mission: "نلتزم بتعزيز الثقافة القانونية وتمكين الأفراد والمؤسسات من الوصول إلى حقوقهم بسهولة ووضوح، من خلال تقديم خدمات قانونية مبتكرة وموثوقة، وربط المستفيدين بكفاءات قانونية مؤهلة، بما يعزز الثقة في المنظومة العدلية ويرتقي بجودة الخدمات القانونية في المملكة.",
    visionTitle: "رؤيتنا",
    vision: "أن نكون المنصة القانونية الرائدة في مملكة البحرين، الداعمة لتحقيق العدالة وسيادة القانون، والمساهمة في بناء مجتمع واعٍ قانونياً، بما يتماشى مع مبادئ التنافسية والاستدامة والشفافية ضمن رؤية البحرين 2030.",
    objectivesTitle: "الأهداف الاستراتيجية",
    objectives: [
      "نشر الوعي القانوني بما يدعم مجتمعاً أكثر إدراكاً لحقوقه وواجباته.",
      "تسهيل الوصول إلى الخدمات القانونية بكفاءة وعدالة لجميع فئات المجتمع.",
      "تعزيز الشفافية والمصداقية في تقديم الخدمات والاستشارات القانونية.",
      "دعم التحول الرقمي في القطاع القانوني بما يواكب التطورات الحديثة.",
      "بناء شبكة مهنية قوية من المحامين والمستشارين القانونيين وفق أعلى المعايير.",
      "الإسهام في رفع تنافسية القطاع القانوني محلياً وإقليمياً.",
    ],
    strategyTitle: "استراتيجيتنا",
    strategy: [
      "تطوير منصة رقمية متكاملة تربط المستفيدين بالمحامين بفعالية وسهولة.",
      "تبني أفضل الممارسات في جودة الخدمات القانونية وتعزيز تجربة المستخدم.",
      "عقد شراكات مع الجهات الحكومية والخاصة لدعم التكامل في الخدمات القانونية.",
      "الاستثمار في الابتكار القانوني والتقنيات الحديثة (LegalTech).",
      "تنفيذ برامج توعوية وتثقيفية مستمرة تدعم أهداف التنمية المستدامة.",
      "ترسيخ مبادئ الحوكمة والشفافية في جميع العمليات والخدمات.",
    ],
    definitionsTitle: "التعريفات",
    definitions: [
      { term: "المنصة", desc: "منصة محامون البحرين للوساطة الإلكترونية" },
      { term: "التطبيق", desc: "أي تطبيق متاح على الأجهزة الذكية المخصص للمنصة" },
      { term: "المستفيد", desc: "كل شخص طبيعي أو اعتباري يستخدم المنصة للحصول على أي خدمة" },
      { term: "المحامي", desc: "كل شخص طبيعي أو اعتباري مرخص له بممارسة مهنة المحاماة من وزارة العدل" },
      { term: "الإدارة و مالك الشركة", desc: "شركة الخليج الدولية للتحصيل والاستشارات ذ.م.م، سجل تجاري رقم 1-78695" },
    ],
    provisionsTitle: "أحكام عامة",
    provisions: [
      "تنطبق هذه الشروط على استخدام المنصة بغض النظر عن طريقة الوصول سواء عبر الموقع الإلكتروني أو تطبيقات الهاتف المحمول.",
      "المنصة غير مسؤولة عن أي اتفاقيات مبرمة بين العملاء والمحامين خارج نطاق المنصة.",
      "الاختصاص القضائي لأي نزاعات ناشئة عن استخدام هذه المنصة يكون لمحاكم مملكة البحرين.",
      "تحتفظ المنصة بالحق في تعديل هذه الشروط في أي وقت. يعتبر الاستمرار في الاستخدام قبولاً بالشروط المعدلة.",
    ],
    bioLabels: {
      previousExperience: "الخبرات ",
      yearsOfExperience: "سنوات الخبرة",
      previousEmployer: "جهة العمل السابقة",
      experience: "الخبرات",
      currentTasks: "المهام الحالية",
    },
    officialStatementTitle: "البيان الرسمي",
  },
};

export default function AboutPage() {
  const isAr = useLocale() === "ar";
  const c = isAr ? content.ar : content.en;

  return (
    <div className="py-16 lg:py-24">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary mb-2">{c.title}</h1>
          <p className="text-primary font-semibold">{c.subtitle}</p>
        </motion.div>

        {/* Intro */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="mb-12">
          <div className="flex gap-6 items-start">
            <Image src="/images/logo-icon.png" alt="Saudi Lawyers" width={80} height={80} className="hidden sm:block flex-shrink-0 mt-1" />
            <p className="text-text-muted leading-relaxed text-lg">{c.intro}</p>
          </div>
        </motion.div>

        {/* Mission & Vision */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }} className="bg-bg-light rounded-xl p-6 border border-gray-100">
            <div className="w-10 h-10 rounded-lg bg-primary/[0.07] flex items-center justify-center mb-3">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-2">{c.missionTitle}</h2>
            <p className="text-text-muted text-sm leading-relaxed">{c.mission}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }} className="bg-bg-light rounded-xl p-6 border border-gray-100">
            <div className="w-10 h-10 rounded-lg bg-primary/[0.07] flex items-center justify-center mb-3">
              <Eye className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-2">{c.visionTitle}</h2>
            <p className="text-text-muted text-sm leading-relaxed">{c.vision}</p>
          </motion.div>
        </div>

        {/* Strategic Objectives */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="mb-12"
        >
          <h2 className="flex items-center gap-2 text-2xl font-bold text-text-primary mb-5">
            <Flag className="w-6 h-6 text-primary" /> {c.objectivesTitle}
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {c.objectives.map((o, i) => (
              <li
                key={i}
                className="flex gap-3 items-start bg-white rounded-lg p-4 border border-gray-100"
              >
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm text-text-muted leading-relaxed">{o}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Strategy */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="mb-12"
        >
          <h2 className="flex items-center gap-2 text-2xl font-bold text-text-primary mb-5">
            <Compass className="w-6 h-6 text-primary" /> {c.strategyTitle}
          </h2>
          <ol className="space-y-3">
            {c.strategy.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-md bg-primary/[0.07] text-primary text-sm font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <p className="text-text-muted text-sm leading-relaxed pt-0.5">{s}</p>
              </li>
            ))}
          </ol>
        </motion.div>

        {/* Executive Profiles */}
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="mb-12">
          <h2 className="flex items-center gap-2 text-2xl font-bold text-text-primary mb-2">
            <Users className="w-6 h-6 text-primary" /> {isAr ? "الملفات التنفيذية" : "Executive Profiles"}
          </h2>
          <p className="text-text-muted text-sm mb-6">
            {isAr
              ? "تعرّف على فريق الإدارة الذي يقف وراء منصة محامون البحرين."
              : "Meet the Management Team behind the Saudi Lawyers platform."}
          </p>
          <div className="space-y-10">
            {execSections.map((section) => (
              <div key={section.roman}>
                <div className="flex items-baseline gap-3 mb-4 pb-2 border-b border-gray-100">
                  <span className="text-sm font-bold text-primary whitespace-nowrap">
                    {section.roman}.
                  </span>
                  <h3 className="text-lg font-extrabold text-text-primary">
                    {isAr ? section.heading.ar : section.heading.en}
                  </h3>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {section.members.map((member, idx) => {
                    const title = isAr ? member.title.ar : member.title.en;
                    const name = member.name ? (isAr ? member.name.ar : member.name.en) : null;
                    const memberSlug = getMemberSlug(member);
                    const bio = member.bio;
                    const tasksLabel = bio?.tasksLabel
                      ? (isAr ? bio.tasksLabel.ar : bio.tasksLabel.en)
                      : c.bioLabels.currentTasks;
                    const isFeatured = !!member.featured;

                    const headerContent = (
                      <>
                        {name && (
                          <h4
                            className={`font-extrabold text-text-primary leading-tight break-words mb-0.5 ${
                              isFeatured ? "text-xl sm:text-2xl" : "text-base"
                            }`}
                          >
                            {name}
                          </h4>
                        )}
                        <p
                          className={`text-text-muted leading-snug break-words ${
                            isFeatured ? "text-sm" : "text-xs"
                          }`}
                        >
                          {title}
                        </p>
                      </>
                    );

                    const bioContent = bio && (
                      <div
                        className={`space-y-3 border-t border-gray-100 ${
                          isFeatured ? "mt-4 pt-4" : "mt-3 pt-3"
                        }`}
                      >
                        {bio.previousExperience && (
                          <BioBlock
                            icon={Briefcase}
                            label={c.bioLabels.previousExperience}
                            items={isAr ? bio.previousExperience.ar : bio.previousExperience.en}
                          />
                        )}
                        {bio.experience && (
                          <BioBlock
                            icon={Award}
                            label={c.bioLabels.experience}
                            items={isAr ? bio.experience.ar : bio.experience.en}
                          />
                        )}
                        {bio.yearsOfExperience && (
                          <BioInline
                            label={c.bioLabels.yearsOfExperience}
                            value={isAr ? bio.yearsOfExperience.ar : bio.yearsOfExperience.en}
                          />
                        )}
                        {bio.previousEmployer && (
                          <BioInline
                            icon={Building2}
                            label={c.bioLabels.previousEmployer}
                            value={isAr ? bio.previousEmployer.ar : bio.previousEmployer.en}
                          />
                        )}
                        <BioBlock
                          icon={ListChecks}
                          label={tasksLabel}
                          items={isAr ? bio.tasks.ar : bio.tasks.en}
                        />
                      </div>
                    );

                    return (
                      <div
                        id={memberSlug || undefined}
                        key={`${section.roman}-${idx}`}
                        className={`scroll-mt-28 bg-white rounded-xl border hover:border-primary/30 transition-colors ${
                          isFeatured
                            ? "lg:col-span-2 p-6 lg:p-7 border-primary/20"
                            : "p-5 border-gray-100"
                        }`}
                      >
                        {isFeatured ? (
                          // Featured: description on the start side, big photo on the
                          // end side. LTR → text-left / photo-right; RTL (Arabic) the
                          // flex row reverses automatically → text-right / photo-left.
                          // On mobile the photo stacks on top.
                          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-start">
                            <div className="flex-1 min-w-0">
                              {headerContent}
                              {bioContent}
                            </div>
                            <MemberAvatar photo={member.photo} name={name} featured />
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start gap-4 mb-3">
                              <MemberAvatar photo={member.photo} name={name} />
                              <div className="min-w-0 flex-1">{headerContent}</div>
                            </div>
                            {bioContent}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Official Statement */}
          <div className="mt-10 p-5 rounded-xl bg-primary/[0.04] border border-primary/20">
            <p className="text-xs uppercase tracking-[0.18em] font-bold text-primary mb-2">
              {c.officialStatementTitle}
            </p>
            <p className="text-sm text-text-secondary leading-relaxed">
              {isAr ? execLegalClause.ar : execLegalClause.en}
            </p>
          </div>
        </motion.div>

        {/* Definitions */}
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="mb-12">
          <h2 className="flex items-center gap-2 text-2xl font-bold text-text-primary mb-5">
            <BookOpen className="w-6 h-6 text-primary" /> {c.definitionsTitle}
          </h2>
          <div className="space-y-3">
            {c.definitions.map((d) => (
              <div key={d.term} className="flex gap-3 bg-white rounded-lg p-4 border border-gray-100">
                <span className="font-bold text-primary text-sm whitespace-nowrap">{d.term}:</span>
                <span className="text-sm text-text-muted">{d.desc}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* General Provisions */}
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
          <h2 className="text-2xl font-bold text-text-primary mb-5">{c.provisionsTitle}</h2>
          <ol className="space-y-3">
            {c.provisions.map((p, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-md bg-primary/[0.07] text-primary text-sm font-bold flex items-center justify-center">{i + 1}</span>
                <p className="text-text-muted text-sm leading-relaxed pt-0.5">{p}</p>
              </li>
            ))}
          </ol>
        </motion.div>
      </div>
    </div>
  );
}

/* ----------------------------- Helper components ----------------------------- */

/** Renders a member's photo when available, otherwise a silhouette
 *  placeholder. `featured` enlarges it for the headline card. */
function MemberAvatar({
  photo,
  name,
  featured = false,
}: {
  photo?: string;
  name: string | null;
  featured?: boolean;
}) {
  const box = featured ? "w-44 h-44 sm:w-56 sm:h-56" : "w-12 h-12";
  const icon = featured ? "w-20 h-20 sm:w-24 sm:h-24" : "w-6 h-6";
  return (
    <div
      className={`${box} rounded-full bg-primary/[0.07] ring-1 ring-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden`}
    >
      {photo ? (
        <Image
          src={photo}
          alt={name ?? "Team member"}
          width={featured ? 448 : 96}
          height={featured ? 448 : 96}
          className="w-full h-full object-cover"
        />
      ) : (
        <User className={`${icon} text-primary/60`} />
      )}
    </div>
  );
}

function BioBlock({
  icon: Icon,
  label,
  items,
}: {
  icon: typeof Briefcase;
  label: string;
  items: string[];
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary mb-1.5">
        <Icon size={12} />
        <span>{label}</span>
      </div>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-xs text-text-muted leading-relaxed">
            <span className="text-primary flex-shrink-0 mt-1.5 w-1 h-1 rounded-full bg-primary" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BioInline({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof Briefcase;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-baseline gap-2 text-xs">
      {Icon && <Icon size={12} className="text-primary flex-shrink-0" />}
      <span className="font-bold  text-text-primary whitespace-nowrap">{label}:</span>
      <span className="text-text-muted leading-relaxed">{value}</span>
    </div>
  );
}
