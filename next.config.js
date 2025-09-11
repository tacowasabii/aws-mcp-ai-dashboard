/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@aws-sdk/client-sts']
  }
}

module.exports = nextConfig