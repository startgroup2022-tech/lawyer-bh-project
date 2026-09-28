export default function CodezyCredit({ locale }: { locale: string }) {
  return <p className="text-xs text-white/70">{locale === "ar" ? "تمت البرمجة بواسطة" : "Developed by"}{" "}<a href="https://codezy-tech.com" target="_blank" rel="noopener noreferrer" className="font-bold text-white underline-offset-4 transition hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-white">{locale === "ar" ? "كودزي" : "Codezy"}</a></p>;
}
