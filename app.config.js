module.exports = ({ config }) => {
  if (process.env.APP_VARIANT !== 'development') return config;

  return {
    ...config,
    name: 'Bothside Dev',
    scheme: 'appbothside-dev',
    ios: {
      ...config.ios,
      bundleIdentifier: 'com.manuelparra.bothside.dev',
    },
    android: {
      ...config.android,
      package: 'com.manuelparra.bothside.dev',
    },
  };
};
