module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Add module-resolver plugin to resolve paths
      [
        'module-resolver',
        {
          alias: {
            '@': '.',
          },
        },
      ],
      'expo-router/babel',
      'react-native-reanimated/plugin',
    ],
    env: {
      production: {
        plugins: ['react-native-paper/babel'],
      },
    },
  };
}; 