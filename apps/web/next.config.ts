import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@strata/ui",
    "@strata/validation",
    "@strata/shared-types",
    "@strata/config",
    "@strata/utils",
  ],
};

export default nextConfig;
