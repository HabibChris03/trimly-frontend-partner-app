const fs = require('fs');
const path = require('path');

let babel;
try {
  babel = require('@babel/core');
} catch (e) {
  // @babel/core not available yet
}

const libDir = path.join(__dirname, '..', 'node_modules', 'react-native-maps', 'lib');
if (babel && fs.existsSync(libDir)) {
  const files = fs.readdirSync(libDir).filter(f => f.endsWith('.js'));
  files.forEach(file => {
    const filePath = path.join(libDir, file);
    const code = fs.readFileSync(filePath, 'utf8');
    if (code.includes('<')) {
      try {
        const result = babel.transformSync(code, {
          plugins: ['@babel/plugin-transform-react-jsx'],
          configFile: false,
          babelrc: false,
        });
        if (result && result.code) {
          fs.writeFileSync(filePath, result.code);
        }
      } catch (err) {
        console.error('Error transforming', file, err.message);
      }
    }
  });
}
