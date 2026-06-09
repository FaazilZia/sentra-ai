try {
  require('ts-node').register({
    transpileOnly: true,
    compilerOptions: {
      ignoreDeprecations: "6.0"
    }
  });
} catch (e) {
  console.warn('ts-node register failed (falling back to default require):', e?.message || e);
}
module.exports = require('./swagger.ts');
