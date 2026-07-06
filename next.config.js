/** @type {import('next').NextConfig} */
const path = require("path");

const nextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/api/bons/**": [
      "./node_modules/pdfkit/js/data/**/*",
      "./assets/cacem-logo.png",
    ],
  },
  async redirects() {
    return [{ source: "/favicon.ico", destination: "/favicon.svg", permanent: false }];
  },
};

module.exports = nextConfig;
