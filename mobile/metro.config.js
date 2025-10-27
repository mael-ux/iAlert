const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// This is the fix:
// Tell the bundler to also look for .txt files
config.resolver.assetExts.push('txt');

module.exports = config;