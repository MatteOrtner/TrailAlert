import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      // Google OAuth avatars
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      // Supabase Storage (dynamic project ref)
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
};

export default nextConfig;
