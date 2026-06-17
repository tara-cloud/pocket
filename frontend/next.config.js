/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    const api = process.env.BACKEND_URL || 'http://localhost:8080';
    return [
      { source: '/api/:path*',   destination: `${api}/api/:path*` },
      { source: '/files/:path*', destination: `${api}/files/:path*` },
    ];
  },
};

module.exports = nextConfig;
