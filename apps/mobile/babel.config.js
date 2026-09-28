/* global module */
module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo adds the react-native-worklets plugin itself when Reanimated is installed,
    // so it must never be listed here as well.
    presets: ['babel-preset-expo'],
  };
};
