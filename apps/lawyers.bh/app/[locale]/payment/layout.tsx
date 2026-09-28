import type { Metadata } from "next";
import { privatePageRobots } from "@/lib/seo/indexing-policy";

export const metadata: Metadata = { robots: privatePageRobots };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
