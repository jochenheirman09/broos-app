/** @type {import('next').NextConfig} */

const withPWA = require('next-pwa')({
  dest: 'public',
  // Point next-pwa to our custom service worker file, which will be output to the public folder.
  swSrc: 'src/sw.js', 
  sw: 'sw.js',
  register: true,
  skipWaiting: true,
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
