const path = require('path')
const { AngularWebpackPlugin } = require('@ngtools/webpack')

const nativeModules = [
    'fs', 'os', 'path', 'child_process', 'stream', 'net',
    'tls', 'crypto', 'events', 'url', 'readline', 'process',
    'electron', '@electron/remote',
]

module.exports = {
    entry: './src/index.ts',
    target: 'node',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'index.js',
        libraryTarget: 'umd',
        libraryExport: 'default',
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: '@ngtools/webpack',
            },
            {
                test: /\.js$/,
                loader: 'babel-loader',
                options: {
                    configFile: false,
                    plugins: ['@angular/compiler-cli/linker/babel'],
                },
            },
            {
                test: /\.scss$/,
                use: ['@tabby-gang/to-string-loader', 'css-loader', {
                    loader: 'sass-loader',
                    options: { api: 'modern' },
                }],
            },
            {
                test: /\.css$/,
                use: ['@tabby-gang/to-string-loader', 'css-loader'],
            },
        ],
    },
    plugins: [
        new AngularWebpackPlugin({
            tsConfigPath: './tsconfig.json',
            jitMode: true,
        }),
    ],
    externals: [
        /^@angular\//,
        /^rxjs/,
        /^tabby-/,
        function ({ request }, callback) {
            if (nativeModules.includes(request)) {
                return callback(null, 'commonjs ' + request)
            }
            callback()
        },
    ],
}
