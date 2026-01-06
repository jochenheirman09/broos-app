
/** @type {import('next').NextConfig} */

const withPWA = require('next-pwa')({
  // Point next-pwa to the public folder. It will generate its own service worker (e.g., sw.js)
  // for offline caching, completely separate from our Firebase worker.
  dest: 'public',
  sw: 'sw.js', // This is the output file for the PWA service worker.
  register: true,
  skipWaiting: true,
  // We disable this during development to avoid caching issues.
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        async_hooks: false,
        child_process: false,
        fs: false, 
        net: false, 
        tls: false, 
      };
    }
    return config;
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
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

module.exports = withPWA(nextConfig);
