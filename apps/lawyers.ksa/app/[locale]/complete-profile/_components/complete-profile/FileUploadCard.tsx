"use client";

import { Eye, Upload, User } from "lucide-react";

type Props = {
  id: string;
  name: string;
  label: string;
  accept: string;
  fileName: string;
  preview: string | null;
  mimeType: string;
  placeholder: string;
  helper: string;
  previewLabel?: string;
  emptyType?: "image" | "file";
  onFileChange: (file: File | undefined) => void;
};

function isImagePreview(preview: string | null, mimeType: string, fileName: string) {
  if (!preview) return false;

  return (
    mimeType.startsWith("image/") ||
    /\.(jpg|jpeg|png|webp|gif|avif|heic|heif)$/i.test(fileName)
  );
}

export default function FileUploadCard({
  id,
  name,
  label,
  accept,
  fileName,
  preview,
  mimeType,
  placeholder,
  helper,
  previewLabel,
  emptyType = "file",
  onFileChange,
}: Props) {
  const showImage = isImagePreview(preview, mimeType, fileName);

  return (
    <div>
      <label className="mb-1.5 block text-sm font-bold text-text-primary">
        {label}
      </label>

      <input
        id={id}
        name={name}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => onFileChange(event.target.files?.[0])}
      />

      <label
        htmlFor={id}
        className="flex cursor-pointer items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 hover:border-primary/30"
      >
        <div className="flex h-[88px] w-[88px] items-center justify-center overflow-hidden rounded-2xl bg-primary/[0.035]">
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview ?? ""} alt="" className="h-full w-full object-cover" />
          ) : preview ? (
            <div className="flex h-full w-full flex-col items-center justify-center bg-red-50 text-red-600">
              <span className="text-lg font-extrabold">PDF</span>
              <span className="mt-1 text-[10px] font-bold">File</span>
            </div>
          ) : emptyType === "image" ? (
            <User className="h-8 w-8 text-primary/45" />
          ) : (
            <Upload className="h-8 w-8 text-primary/45" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-text-primary">
            {fileName || placeholder}
          </p>

          <p className="mt-1 text-xs text-text-muted">{helper}</p>

          {preview && previewLabel && (
            <a
              href={preview}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-extrabold text-primary hover:text-primary-dark"
            >
              <Eye className="h-3.5 w-3.5" />
              {previewLabel}
            </a>
          )}
        </div>
      </label>
    </div>
  );
}
