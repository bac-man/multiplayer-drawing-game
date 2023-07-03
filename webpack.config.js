const HtmlWebpackPlugin = require("html-webpack-plugin");
const interfaces = require("os").networkInterfaces();
const Dotenv = require("dotenv-webpack");
const webpack = require("webpack");
require("dotenv").config();

const getIPAddress = () => {
  for (const deviceName in interfaces) {
    const interface = interfaces[deviceName];
    for (let i = 0; i < interface.length; i++) {
      const alias = interface[i];
      if (
        alias.family === "IPv4" &&
        alias.address !== "127.0.0.1" &&
        !alias.internal
      ) {
        return alias.address;
      }
    }
  }
};

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
      "process.env.WS_SERVER_ADDRESS": JSON.stringify(getIPAddress()),
    }),
  ],
};
