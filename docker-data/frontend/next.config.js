/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // This is a good default to have
  eslint: {
    // Warning: This option is deprecated.
    // We recommend using a linting step in your CI pipeline instead.
    // See https://nextjs.org/docs/basic-features/eslint#linting-during-builds
    // However, for local development, it can still be useful to enforce this.
    ignoreDuringBuilds: false, // This will make the build fail on ESLint errors
  },
  // If you were using TypeScript and wanted to fail build on TS errors:
  // typescript: {
  //   ignoreBuildErrors: false,
  // },
};

module.exports = nextConfig; 
