import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@stellar/stellar-sdk"],
  experimental: {
    proxyClientMaxBodySize: "30mb",
  },
};

export default nextConfig;
