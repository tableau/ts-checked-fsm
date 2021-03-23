const path = require('path');

module.exports = {

  entry: path.resolve(__dirname, 'src', 'Index.ts'),

  output: {
    path: path.resolve(__dirname, 'lib'),
    filename: 'index.js',
    library: 'ts-checked-fsm',
    libraryTarget: 'commonjs',
  },

  stats: {
    assets: false,
    colors: true,
    hash: false,
    version: false
  },

  devtool: 'source-map',

  resolve: {
    modules: [
      path.resolve(__dirname, 'src'),
      'node_modules'
    ],
    extensions: ['.ts', '.tsx', '.js']
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            compilerOptions: {
              outDir: '.',
            }
          }
        }
      },
    ],
  },

  externals: {
    'redux': {
      root: 'redux',
      commonjs: 'redux',
      commonjs2: 'redux',
      amd: 'redux',
    },
    'react-saga': {
      root: 'redux-saga',
      commonjs: 'redux-saga',
      commonjs2: 'redux-saga',
      amd: 'redux-saga',
    }
  },
};
