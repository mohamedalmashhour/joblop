/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders() }];
  }
};

function securityHeaders() {
  const headers = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
    }
  ];
  return headers;
}

export default nextConfig;
