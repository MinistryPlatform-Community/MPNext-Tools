import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['mjml', 'mjml-core', 'mjml-validator', 'uglify-js'],
};

export default nextConfig;
