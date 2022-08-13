const path = require("path");

const clientConfig = {
  entry: {
    client: './src/client/client.ts',
  } ,
  output: {
    path: `${__dirname}/dist/client`,
    filename: '[name].js',
    globalObject: 'this'
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)?$/,
        use: 'ts-loader'
      }
    ]
  },
  resolve: {
    modules: [
    "node_modules",
    ],
    extensions: [
    '.ts',
    '.js'
    ]
  },

  devtool: 'source-map',
  devServer: {
    contentBase: 'dist/client',
    port: 4321
  }
};

module.exports = [clientConfig]
