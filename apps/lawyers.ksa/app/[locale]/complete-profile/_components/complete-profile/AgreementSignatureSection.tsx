"use client";

import type { Dispatch, RefObject, SetStateAction } from "react";
import { Eye, Scale } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";

type Props = {
  isAr: boolean;
  points: string[];
  agreed: boolean;
  setAgreed: Dispatch<SetStateAction<boolean>>;
  signatureReady: boolean;
  isChangingSignature: boolean;
  signedAgreementUrl: string;
  signatureRef: RefObject<SignatureCanvas | null>;
  setSignatureDataUrl: Dispatch<SetStateAction<string>>;
  setSignatureReady: Dispatch<SetStateAction<boolean>>;
  setIsChangingSignature: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string>>;
  startChangingSignature: () => void;
  clearSignatureCanvas: () => void;
};

export default function AgreementSignatureSection({
  isAr,
  points,
  agreed,
  setAgreed,
  signatureReady,
  isChangingSignature,
  signedAgreementUrl,
  signatureRef,
  setSignatureDataUrl,
  setSignatureReady,
  setIsChangingSignature,
  setError,
  startChangingSignature,
  clearSignatureCanvas,
}: Props) {
  return (
    <>
      <div className="rounded-xl border border-gray-100 bg-bg-light p-5">
        <h3 className="mb-4 flex items-center gap-2 font-bold text-text-primary">
          <Scale className="h-5 w-5 text-primary" />
          {isAr ? "اتفاقية مقدم الخدمة" : "Service Provider Agreement"}
        </h3>

        <ol className="mb-5 space-y-3">
          {points.map((point, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {i + 1}
              </span>
              <span className="text-sm leading-relaxed text-text-muted">
                {point}
              </span>
            </li>
          ))}
        </ol>

        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => {
              setAgreed(event.target.checked);
              if (event.target.checked) setError("");
            }}
            className="mt-1 accent-primary"
          />

          <span className="text-sm text-text-secondary">
            {isAr
              ? "أوافق على الشروط والأحكام واتفاقية مقدم الخدمة"
              : "I agree to the Terms & Conditions and Service Provider Agreement"}
          </span>
        </label>

        {!agreed && (
          <p className="mt-3 text-xs font-bold text-amber-600">
            {isAr
              ? "يجب الموافقة على الاتفاقية قبل إكمال وتفعيل الحساب."
              : "You must agree to the agreement before completing and activating the account."}
          </p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-bold text-text-primary">
          {isAr ? "التوقيع والاتفاقية" : "Signature & Agreement"}
        </label>

        {signatureReady && !isChangingSignature ? (
          <div className="rounded-2xl border border-primary/15 bg-primary/[0.035] p-5">
            <div className="rounded-xl border border-primary/15 bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-extrabold text-text-primary">
                <Scale className="h-4 w-4 text-primary" />
                {isAr ? "معاينة الاتفاقية" : "Agreement Preview"}
              </div>

              <p className="mt-2 text-xs leading-6 text-text-muted">
                {isAr
                  ? "اتفاقية مقدم الخدمة جاهزة. سيتم دمج التوقيع داخل ملف PDF بعد الضغط على زر إكمال وتفعيل الحساب."
                  : "The service provider agreement is ready. The signature will be merged into the PDF after clicking Complete and Activate Account."}
              </p>

              <div className="mt-3 grid gap-2">
                {points.slice(0, 3).map((point, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-extrabold text-primary">
                      {i + 1}
                    </span>
                    <span className="text-xs leading-6 text-text-muted">
                      {point}
                    </span>
                  </div>
                ))}
              </div>

              {signedAgreementUrl && (
                <a
                  href={signedAgreementUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-white px-4 py-2.5 text-xs font-extrabold text-primary hover:bg-primary/[0.04]"
                >
                  <Eye className="h-4 w-4" />
                  {isAr ? "معاينة الاتفاقية" : "Preview Agreement"}
                </a>
              )}
            </div>

            <button
              type="button"
              onClick={startChangingSignature}
              className="mt-4 text-xs font-extrabold text-red-600 hover:text-red-700"
            >
              {isAr ? "تغيير التوقيع" : "Change Signature"}
            </button>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-gray-200 bg-white p-2">
              <SignatureCanvas
                ref={signatureRef}
                onEnd={() => {
                  const dataUrl =
                    signatureRef.current && !signatureRef.current.isEmpty()
                      ? signatureRef.current.toDataURL("image/png")
                      : "";

                  setSignatureDataUrl(dataUrl);
                  setSignatureReady(Boolean(dataUrl));
                  setIsChangingSignature(true);
                  setError("");
                }}
                canvasProps={{
                  className: "h-44 w-full rounded-lg bg-white",
                }}
              />
            </div>

            <button
              type="button"
              onClick={clearSignatureCanvas}
              className="mt-2 text-xs font-bold text-red-600"
            >
              {isAr ? "مسح التوقيع" : "Clear Signature"}
            </button>

            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700">
              {isAr
                ? "ارسم التوقيع ثم اضغط إكمال وتفعيل الحساب."
                : "Draw your signature, then click Complete and Activate Account."}
            </div>
          </>
        )}
      </div>
    </>
  );
}
