import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    reactStrictMode: true,
    typedRoutes: true,
    turbopack: {
        root: __dirname,
    },
    async redirects() {
        return [
            {
                source: "/auth/login",
                destination: "/login",
                permanent: true,
            },
            {
                source: "/auth/signup",
                destination: "/signup",
                permanent: true,
            },
            {
                source: "/dashboard",
                destination: "/profile",
                permanent: true,
            },
        ];
    },
};

export default nextConfig;
