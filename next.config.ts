import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    reactStrictMode: true,
    typedRoutes: true,
    turbopack: {
        root: __dirname,
    },
};

export default nextConfig;
