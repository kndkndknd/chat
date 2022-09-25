const path = require("path");

const clientConfig = {
  // メインとなるJavaScriptファイル（エントリーポイント）
  entry: {
    // client: './src/client/client.js',
    // mobile: './src/client/workletProcessor.js',
    client: './src/client/client.ts',
    snowLeopardClient: './src/client/snowLeopardClient.js',
    threeClient: './src/client/threeClient.ts',
    orientation: './src/client/orientation.ts',
//    facetest: './src/client/facetest.ts',
    vosk_recognition: './src/client/vosk_recognition.js'
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
        exclude: /node_modules/
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
    ],
    fallback: { fs: false }
  },

  // ソースマップを有効にする
  devtool: 'source-map',
  devServer: {
    contentBase: 'dist/client',
    port: 4321
  }
};

module.exports = [clientConfig]
