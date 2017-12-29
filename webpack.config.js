const glob = require("glob");
const path = require("path");
const webpack = require("webpack");

const srcDir = "./src/";
let scriptFiles = glob.sync("./src/*.js");
let scripts = {};

for (let i in scriptFiles){
  var script = scriptFiles[i];
  scripts[script.slice(srcDir.length,-3)] = script;
}


module.exports = {
  // メインとなるJavaScriptファイル（エントリーポイント）
  entry: {
    client: './src/client.js',
    ctrl: './src/ctrl.js'
  } ,
  // entry: scripts,
  // ファイルの出力設定
  output: {
    //  出力ファイルのディレクトリ名
    path: `${__dirname}/public/javascripts`,
    // 出力ファイル名
    filename: '[name].js'
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
                ['env', {'modules': false}]
              ]
            }
          }
        ],
        // node_modulesは除外する
        exclude: /node_modules/,
      }
    ]
  },
  // ソースマップを有効にする
  devtool: 'source-map',
  devServer: {
    contentBase: 'public/javascripts',
    port: 4321
  }
};
