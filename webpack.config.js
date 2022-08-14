// const glob = require("glob");
const path = require("path");
// const webpack = require("webpack");

// const srcDir = "./src/";
// let scriptFiles = glob.sync("./src/*.js");
/*
let scripts = {};

for (let i in scriptFiles){
  var script = scriptFiles[i];
  scripts[script.slice(srcDir.length,-3)] = script;
}
*/

const clientConfig = {
  // メインとなるJavaScriptファイル（エントリーポイント）
  entry: {
    // client: './src/client/client.js',
    // mobile: './src/client/workletProcessor.js',
    client: './src/client/client.ts',
    threeClient: './src/client/threeClient.ts',
  } ,
  // entry: scripts,
  // ファイルの出力設定
  output: {
    //  出力ファイルのディレクトリ名
    path: `${__dirname}/dist/client`,
    // 出力ファイル名
    filename: '[name].js',
    globalObject: 'this'
  },
  module: {
    rules: [
      {
        // 拡張子 .js の場合
        test: /\.js$/,
        use: [
          {
            // Babel を利用する
            loader: 'babel-loader',
            // Babel のオプションを指定する
            options: {
              presets: [
                // env を指定することで、ES2017 を ES5 に変換。
                // {modules: false}にしないと import 文が Babel によって CommonJS に変換され、
                // webpack の Tree Shaking 機能が使えない
 //               ['env', {'modules': false}]
                ['@babel/preset-env', {'modules': false}]
              ]
            }
          }
        ],
        // node_modulesは除外する
        // exclude: /node_modules/
      },
      { //拡張子.tsの場合
        test: /\.(ts|tsx)?$/,
        use: 'ts-loader'
      }
    ]
  },
  resolve: {
    modules: [
    "node_modules", // node_modules 内も対象とする
    ],
    extensions: [
    '.ts',
    '.js' // node_modulesのライブラリ読み込みに必要
    ]
  },

  // ソースマップを有効にする
  devtool: 'source-map',
  devServer: {
    contentBase: 'dist/client',
    port: 4321
  }
};

const serverConfig = {
  mode: "development",
  entry: "./src/server/app.ts",
  target: "node",
  node: {
    // expressを使うときにはこの設定をしないと失敗します
    // 参考：https://medium.com/@binyamin/creating-a-node-express-webpack-app-with-dev-and-prod-builds-a4962ce51334
    __dirname: false,
    __filename: false,
  },
  // externals: [nodeExternals()],
  module: {
    rules: [{
      test: /\.ts$/,
      use: "ts-loader",
      exclude: /node_modules/,
    }]
  },
  resolve: {
    extensions: [".ts", ".js"]
  },
}
module.exports = [clientConfig]
// module.exports = [serverConfig]