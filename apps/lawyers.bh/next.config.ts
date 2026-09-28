import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  /* config options here */
serverExternalPackages: ["ws"],
images: {
  remotePatterns: [
    {
      protocol: "https",
      hostname: "02e4jixmbxhjiiww.public.blob.vercel-storage.com",
      pathname: "/**",
    },
  ],
},
};

export default withNextIntl(nextConfig);
