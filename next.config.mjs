/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/trainer', destination: '/radio-lab', permanent: true },
    ]
  },
}

export default nextConfig
