import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@vkieu/mui",
    "@strata/ui",
    "@strata/validation",
    "@strata/shared-types",
    "@strata/config",
    "@strata/utils",
  ],
};

export default nextConfig;
