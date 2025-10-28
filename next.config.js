/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude problematic packages from server-side bundle
      config.externals.push('better-sqlite3', 'sqlite3');
    }
    return config;
  }
}

module.exports = nextConfig