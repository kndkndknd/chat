const path = require("path");

const clientConfig = {
  // メインとなるJavaScriptファイル（エントリーポイント）
  entry: {
    client: "./src/client.ts",
    ctrl: "./src/ctrl.ts",
    snowLeopardClient: "./src/snowLeopard.mjs",
  },
  // entry: scripts,
  // ファイルの出力設定
  output: {
    //  出力ファイルのディレクトリ名
    path: `${__dirname}/dist`,
    // 出力ファイル名
    filename: "[name].js",
    globalObject: "this",
  },
  module: {
    rules: [
      {
        // 拡張子 .js の場合
        test: /\.js$/,
        use: [
          {
            // Babel を利用する
            loader: "babel-loader",
            // Babel のオプションを指定する
            options: {
              presets: [["@babel/preset-env", { modules: false }]],
            },
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.mjs$/, // .mjsファイルにマッチする
        exclude: /(node_modules|bower_components)/, // これらのディレクトリを除外
        use: {
          loader: "babel-loader", // Babelを使用してトランスパイル
          options: {
            presets: ["@babel/preset-env"], // 使用するプリセット
          },
        },
      },
      {
        //拡張子.tsの場合
        test: /\.(ts|tsx)?$/,
        use: "ts-loader",
      },
    ],
  },
  resolve: {
    modules: [
      "node_modules", // node_modules 内も対象とする
    ],
    extensions: [
      ".ts",
      ".js",
      ".mjs", // node_modulesのライブラリ読み込みに必要
    ],
    fallback: { fs: false },
  },
  // ソースマップを有効にする
  devtool: "source-map",
  devServer: {
    server: {
      type: "https",
      /*
      options: {
        key: '../keys/server.key',
        cert: '../keys/server.crt'
      }
      */
    },
    port: 8888,
    static: [
      {
        directory: path.join(__dirname, "assets"),
      },
    ],
    host: "0.0.0.0",
    proxy: {
      "/socket.io": "http://localhost:8000",
    },
  },
};

module.exports = [clientConfig];
