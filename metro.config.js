// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Disable package.json exports field to fix compatibility issues with libraries like Supabase
config.resolver.unstable_enablePackageExports = false;

// Add additional configuration to fix resolution issues
config.resolver.unstable_conditionNames = ['require', 'default', 'browser'];

// Ensure Metro can find all the necessary modules
config.resolver.nodeModulesPaths = [
  `${__dirname}/node_modules`,
];

// Resolver settings for better compatibility
config.resolver.sourceExts = ['js', 'jsx', 'json', 'ts', 'tsx', 'cjs', 'mjs'];

module.exports = config; 