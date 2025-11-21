const { withPlugins } = require('@expo/config-plugins');

const withChromaprint = (config) => {
    return withPlugins(config, [
        // Placeholder for future Android/iOS specific plugins
        // that will copy the native files and link them.
        // For now, this plugin just returns the config to avoid breaking build.
    ]);
};

module.exports = withChromaprint;
