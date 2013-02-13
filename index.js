Tandem = process.env.TANDEM_COV ? require('./src-js-cov/server/tandem') : require('./src/server/tandem')

module.exports = Tandem
