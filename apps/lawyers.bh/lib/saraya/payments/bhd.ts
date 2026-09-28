export function parseBhdMills(value: unknown): bigint {
  if (typeof value === "string") {
    if (!/^\d+\.\d{3}$/.test(value)) throw new Error("INVALID_BHD_AMOUNT");
    return BigInt(value.replace(".", ""));
  }
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    const text = String(value);
    const match = /^(\d+)(?:\.(\d{1,3}))?$/.exec(text);
    if (!match) throw new Error("INVALID_BHD_AMOUNT");
    return BigInt(match[1]) * BigInt(1000) + BigInt((match[2] ?? "").padEnd(3, "0"));
  }
  throw new Error("INVALID_BHD_AMOUNT");
}

export function formatBhdMills(mills: bigint): string {
  if (mills < BigInt(0)) throw new Error("INVALID_BHD_AMOUNT");
  return `${mills / BigInt(1000)}.${(mills % BigInt(1000)).toString().padStart(3, "0")}`;
}
