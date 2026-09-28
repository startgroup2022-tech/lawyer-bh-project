import { isIP } from "node:net";
import type { PublicOnboardingContext } from "./contracts";

function ipv4Tail(value: string) {
  const parts = value.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return null;
  }
  return [
    ((parts[0]! << 8) | parts[1]!).toString(16),
    ((parts[2]! << 8) | parts[3]!).toString(16),
  ];
}

function expandedIpv6(value: string) {
  let address = value.toLowerCase();
  if (address.includes(".")) {
    const lastColon = address.lastIndexOf(":");
    const tail = ipv4Tail(address.slice(lastColon + 1));
    if (!tail) return null;
    address = `${address.slice(0, lastColon)}:${tail.join(":")}`;
  }
  const halves = address.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || (halves.length === 2 && missing < 1)) {
    return null;
  }
  const groups = [
    ...left,
    ...Array.from({ length: missing }, () => "0"),
    ...right,
  ].map((part) => Number.parseInt(part, 16));
  if (groups.length !== 8 || groups.some((part) => !Number.isInteger(part) || part < 0 || part > 0xffff)) {
    return null;
  }
  return groups;
}

function sanitizedIp(value: string) {
  const trimmed = value.trim();
  if (isIP(trimmed) === 4) {
    const parts = trimmed.split(".");
    return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
  }
  if (isIP(trimmed) === 6) {
    const groups = expandedIpv6(trimmed);
    if (!groups) return "unavailable";
    return `${groups.slice(0, 4).map((part) => part.toString(16)).join(":")}::/64`;
  }
  return trimmed === "development" ? "development" : "unavailable";
}

function sanitizedUserAgent(value?: string | null) {
  if (!value) return null;
  const sanitized = value.replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 256);
  return sanitized || null;
}

export function sanitizePublicOnboardingContext(context: PublicOnboardingContext) {
  return {
    ipAddress: sanitizedIp(context.ip),
    userAgent: sanitizedUserAgent(context.userAgent),
  };
}
