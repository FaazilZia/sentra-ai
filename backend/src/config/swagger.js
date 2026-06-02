try {
  require('ts-node').register({
    transpileOnly: true,
    compilerOptions: {
      ignoreDeprecations: "6.0"
    }
  });
} catch (e) {
  // Safe fallback if ts-node is not loaded
}
module.exports = require('./swagger.ts');
