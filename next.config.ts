import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // Se desactiva en desarrollo para no molestar el caché
});

const nextConfig: NextConfig = {
  output: "standalone",
  // Le decimos a Turbopack que ignore esta librería vieja de Node y no la empaquete
  serverExternalPackages: ["@afipsdk/afip.js"],
  // Explicitly tell Next.js we handle Webpack/Turbopack gracefully so builds don't fail
  turbopack: {}
};

export default withPWA(nextConfig);
