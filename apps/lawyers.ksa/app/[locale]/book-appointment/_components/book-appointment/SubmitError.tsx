"use client";

type Props = {
  isAr: boolean;
  step: number;
  submitError: string | null;
};

export default function SubmitError({ isAr, step, submitError }: Props) {
  if (!submitError || step !== 4) return null;

  return (
    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {isAr ? "تعذر إرسال الطلب. حاول مرة أخرى." : "Could not send your request. Please try again."}
      <span className="block text-xs text-red-500 mt-1">{submitError}</span>
    </div>
  );
}
