// Based very loosely on https://www.reactstarterkit.com/

import path from 'path';
import webpack from 'webpack';

const isDebug = process.env.NODE_ENV === 'production';

const config = {
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
                loader: 'babel-loader',
                include: [
                    path.resolve(__dirname, './src')
                ],
                exclude: [/node_modules/],
                query: {
                    presets: ['es2015']
                }
            }
        ]
    },
    resolve: {
        modules: [path.resolve(__dirname, 'src'), 'node_modules']
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
        }),

        ...isDebug ? [] : [
            // Minimize all JavaScript output of chunks
            // https://github.com/mishoo/UglifyJS2#compressor-options
            new webpack.optimize.UglifyJsPlugin({
                sourceMap: true,
                compress: {
                    screw_ie8: true, // eslint-disable-line
                    warnings: false
                }
            })
        ]
    ],

    devtool: isDebug ? 'inline-source-map' : 'source-map',

    stats: {
        colors: true,
        reasons: isDebug,
        timings: true
    }
};

export default config;
