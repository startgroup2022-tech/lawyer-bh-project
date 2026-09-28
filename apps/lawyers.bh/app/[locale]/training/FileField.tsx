"use client";
import { useRef } from "react";
import { FileUp, X } from "lucide-react";
import type { FileKind } from "@/lib/training/types";

export default function FileField({ kind, file, onChange, ar }: { kind: FileKind; file: File | null; onChange: (file: File | null) => void; ar: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const title = kind === "cv" ? (ar ? "السيرة الذاتية" : "Curriculum vitae") : (ar ? "رسالة الجامعة (اختياري)" : "University letter (optional)");
  return <div className="min-w-0 rounded-2xl bg-[#F3F6FA] p-5">
    <label htmlFor={kind} className="flex items-center gap-2 text-sm font-bold"><FileUp className="h-5 w-5 shrink-0 text-[#B4232A]" />{title}{kind === "cv" ? " *" : ""}</label>
    <p id={`${kind}-help`} className="mt-2 text-xs leading-6 text-slate-600">{ar ? "PDF غير محمي بكلمة مرور · حتى ٥ ميجابايت" : "PDF without a password · up to 5 MB"}</p>
    <input ref={input} id={kind} name={kind} type="file" required={kind === "cv"} accept="application/pdf,.pdf" aria-describedby={`${kind}-help`} onChange={event => onChange(event.target.files?.[0] ?? null)} className="mt-3 block w-full min-w-0 text-xs file:me-2 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:font-bold file:text-[#082B67]" />
    {file ? <div className="mt-3 flex items-center gap-2 text-xs"><span className="min-w-0 flex-1 break-all">{file.name} · {(file.size / (1024 * 1024)).toFixed(2)} MB</span><button type="button" aria-label={ar ? `إزالة ${title}` : `Remove ${title}`} onClick={() => { if (input.current) input.current.value = ""; onChange(null); }} className="rounded-lg bg-white p-2 text-red-700"><X className="h-4 w-4" /></button></div> : null}
  </div>;
}
