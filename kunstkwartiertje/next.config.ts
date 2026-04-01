import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
<<<<<<< HEAD
    root: __dirname,
=======
    root: process.cwd(),
>>>>>>> bbbfee9d73ff71b31a985eb4f7a46ab080fb97c6
  },
};

export default nextConfig;
