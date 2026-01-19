import type { NextConfig } from "next";
import { config } from "dotenv";

// Load additional env files
config({ path: ".env.integrations" });

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
