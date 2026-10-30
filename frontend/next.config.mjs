/** @type {import('next').NextConfig} */
const nextConfig = {
  // `standalone` produces a self-contained server bundle for the production
  // container (see infrastructure/docker/prod/frontend.Dockerfile). It has no
  // effect on `next dev`.
  output: "standalone",
};

export default nextConfig;
