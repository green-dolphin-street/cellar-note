/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: "dist",
  output: "standalone",
  images: { unoptimized: true }
};

export default nextConfig;
