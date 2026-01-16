module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            // ... otros plugins si los tuvieras ...
            'react-native-reanimated/plugin', // <--- ¡ESTA LÍNEA ES LA CLAVE!
        ],
    };
};