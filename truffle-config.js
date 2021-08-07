const path = require("path");
const HDWalletProvider = require("@truffle/hdwallet-provider");
require("dotenv").config();

module.exports = {
  // See http://truffleframework.com/docs/advanced/configuration
  // to customize your Truffle configuration!
  contracts_build_directory: path.join(__dirname, "client/src/contracts"),
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*",
    },
    ropsten: {
        network_id: 3,
        provider: function () {
          return new HDWalletProvider(process.env.MNEMONIC, process.env.ROPSTEN_URL);
        },
        gas: 5000000,
        gasPrice: 45000000000,
        confirmations: 2,
        timeoutBlocks: 200,
        skipDryRun: false,
        websocket: false,
        timeoutBlocks: 50000,
        networkCheckTimeout: 1000000
      }
  },
  compilers: {
    solc: {
      version: "^0.8.0",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    },
  },
};