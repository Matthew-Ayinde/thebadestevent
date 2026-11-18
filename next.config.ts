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
      // Events from the old Hotel Medallion microsite now live at /{slug} (see scripts/migrate-hotel-medallion.ts).
      { source: "/hotel-medallion/events/:slug", destination: "/:slug", permanent: true },
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
