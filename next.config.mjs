/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allows testing the Next.js dev server from the LAN host that was
  // previously used during development. localhost testing is unaffected.
  allowedDevOrigins: ['160.160.5.16'],
};

export default nextConfig;
