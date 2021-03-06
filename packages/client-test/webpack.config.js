var path = require('path');
var HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  context: __dirname,
  devtool: 'cheap-module-eval-source-map',
  mode: 'development',
  entry: [
    'babel-polyfill',
    './src/client.js',
  ],
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    sourceMapFilename: '[name].map',
  },
  // devtool: 'source-map',
  plugins: [
    new HtmlWebpackPlugin({
      title: 'WebGLue'
    })
  ],
  module: {
    rules: [
      {
        test: /\.js$/i,
        exclude: /node_modules/,
        use: ['babel-loader'],
      },
      {
        test: /\.html$/i,
        use: ['html-loader'],
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /(\.vert|\.frag|\.obj|\.mtl|\.dae)$/i,
        use: ['raw-loader'],
      },
      {
        test: /\.(png|jpe?g|gif|tiff|mp4|mkv|webm)?$/,
        use: ['file-loader'],
      }
    ]
  }
};
