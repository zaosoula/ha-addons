const { poller } = require("./lib/poller")

module.exports = (voltalis) => {
  return {
    immediateConsumptionInkW: poller('*/10 * * * * *', voltalis.fetchImmediateConsumptionInkW)
  }
}
