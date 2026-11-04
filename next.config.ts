import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  async redirects() {
    return [
      // /feedback was renamed to /ilewa; keep shared links, bookmarks and tabs
      // opened before the rename working.
      { source: "/feedback", destination: "/ilewa", permanent: true },
      { source: "/admin/feedback", destination: "/admin/ilewa", permanent: true },
      { source: "/api/feedback/:path*", destination: "/api/ilewa/:path*", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        // Ask Chromium browsers for the device model and OS version (hidden
        // from their user agent) so analytics can report them.
        source: "/:path*",
        headers: [{ key: "Accept-CH", value: "Sec-CH-UA-Model, Sec-CH-UA-Platform-Version" }],
      },
    ];
  },
};

export default nextConfig;
