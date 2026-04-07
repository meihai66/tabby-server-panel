const path = require('path')

module.exports = {
  entry: './src/index.ts',
  target: 'node',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    library: {
      type: 'commonjs2',
    },
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.scss$/,
        use: ['css-loader', 'sass-loader'],
      },
      {
        test: /\.css$/,
        use: ['css-loader'],
      },
    ],
  },
  externals: {
    'tabby-core': 'commonjs tabby-core',
    'tabby-terminal': 'commonjs tabby-terminal',
    'tabby-ssh': 'commonjs tabby-ssh',
    '@angular/core': 'commonjs @angular/core',
    '@angular/common': 'commonjs @angular/common',
    '@angular/forms': 'commonjs @angular/forms',
    '@angular/platform-browser': 'commonjs @angular/platform-browser',
    'rxjs': 'commonjs rxjs',
    'rxjs/operators': 'commonjs rxjs/operators',
  },
}
