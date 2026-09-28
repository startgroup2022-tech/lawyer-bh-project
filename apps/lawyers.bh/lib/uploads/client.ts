import { parseManifest, type UploadWorkflow } from "./policy";

export async function prepareDirectForm(
  form: FormData,
  workflow: UploadWorkflow,
  progress?: (percent: number) => void,
) {
  const files = [...form.entries()].filter(
    (entry): entry is [string, File] =>
      entry[1] instanceof File && entry[1].size > 0,
  );
  if (!files.length) return form;
  const manifest = parseManifest(
    workflow,
    files.map(([field, file]) => ({
      field,
      name: file.name,
      size: file.size,
      type: file.type,
    })),
  );
  const response = await fetch("/api/uploads/direct", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      workflow,
      files: manifest,
      inviteToken: workflow === "complete" ? form.get("token") : undefined,
    }),
  });
  if (!response.ok)
    throw new Error(
      "تعذر بدء رفع الملفات. يرجى المحاولة مرة أخرى. / Could not start upload. Please retry.",
    );
  const data = (await response.json()) as {
    session: string;
    files: { id: string; field: string; url: string; type: string }[];
  };
  const result = new FormData();
  form.forEach((value, key) => result.append(key, value));
  progress?.(0);
  for (const [index, item] of data.files.entries()) {
    const file = files.find(([field]) => field === item.field)?.[1];
    if (!file) throw new Error("Invalid upload manifest");
    const uploaded = await fetch(item.url, {
      method: "PUT",
      headers: { "Content-Type": item.type },
      body: file,
    });
    if (!uploaded.ok)
      throw new Error(
        "تعذر رفع الملف. يرجى المحاولة مرة أخرى. / File upload failed. Please retry.",
      );
    result.set(item.field, `direct:${item.id}`);
    progress?.(Math.round(((index + 1) / data.files.length) * 100));
  }
  result.set("uploadSession", data.session);
  return result;
}
