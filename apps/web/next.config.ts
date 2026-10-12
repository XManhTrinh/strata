import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@vkieu/windmorph",
    "@strata/ui",
    "@strata/validation",
    "@strata/shared-types",
    "@strata/config",
    "@strata/utils",
  ],
  async redirects() {
    // Finance routes were consolidated under /finance. Keep old links working.
    return [
      { source: "/budgets", destination: "/finance/budgets", permanent: true },
      { source: "/capacity", destination: "/finance/capacity", permanent: true },
    ];
  },
};

export default nextConfig;
