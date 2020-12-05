// Based very loosely on https://www.reactstarterkit.com/

const path = require('path');
const webpack = require('webpack');

const isDebug = process.env.NODE_ENV === 'production';

module.exports = {
    mode: isDebug ? 'development' : 'production',
    context: path.resolve(__dirname, 'src'),

    entry: path.resolve(__dirname, 'src/EventLoopPrinter.js'),
    target: 'web',

    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'EventLoopPrinterWebpacked.js'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                },
                include: [
                    path.resolve(__dirname, './src')
                ],
                exclude: [/node_modules/]
            }
        ]
    },
    // Don't attempt to continue if there are any errors.
    bail: !isDebug,
    cache: isDebug,
    plugins: [
        new webpack.DefinePlugin({
            __VERSION__: JSON.stringify(require('./package.json').version), // eslint-disable-line
            'process.env.NODE_ENV': isDebug ? '"development"' : '"production"',
            'process.env.BROWSER': true,
            __DEV__: isDebug
        })
    ],

    devtool: isDebug ? 'inline-source-map' : 'source-map',

    stats: {
        colors: true,
        reasons: isDebug,
        timings: true
    }
};
