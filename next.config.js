/** @type {import('next').NextConfig} */

const nextConfig = {
  webpack: (config, { isServer }) => {
    // This is the fix for the 'async_hooks' and 'child_process' errors.
    // It tells Webpack to not try to bundle these server-side modules
    // for the client-side.
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        async_hooks: false,
        child_process: false,
        fs: false, // Often needed with server-side SDKs
        net: false, // Often needed with server-side SDKs
        tls: false, // Often needed with server-side SDKs
      };
    }

    return config;
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
