const HtmlWebpackPlugin = require("html-webpack-plugin");
const Dotenv = require("dotenv-webpack");
const webpack = require("webpack");
const { getLocalIP } = require("./getLocalIP");
require("dotenv").config();

module.exports = {
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        },
      },
      {
        test: /\.module\.s(c|a)ss$/,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              modules: true,
            },
          },
          {
            loader: "sass-loader",
            options: {
              api: "modern",
            },
          },
        ],
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  devServer: {
    port: process.env.FRONT_END_SERVER_PORT || 3000,
    open: true,
  },
  resolve: {
    extensions: [".jsx", ".js"],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./public/index.html",
      filename: "./index.html",
    }),
    new Dotenv(),
    new webpack.DefinePlugin({
      "process.env.WS_SERVER_ADDRESS": JSON.stringify(getLocalIP()),
    }),
  ],
};
