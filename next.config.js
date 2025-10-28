/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3', 'sqlite3']
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude problematic packages from server-side bundle
      config.externals.push('better-sqlite3', 'sqlite3');
    }
    return config;
  },
  // Ensure these packages are not included in the build
  transpilePackages: [],
  // Exclude from static optimization
  generateBuildId: async () => {
    return 'build-' + Date.now()
  }
}

module.exports = nextConfig