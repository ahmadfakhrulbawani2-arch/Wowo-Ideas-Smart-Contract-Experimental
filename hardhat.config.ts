import type { HardhatUserConfig } from "hardhat/config";
import hardhatToolboxViem from "@nomicfoundation/hardhat-toolbox-viem";
import "dotenv/config";

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxViem],
  solidity: "0.8.20",
  networks: {
    sepolia: {
      type: "http",
      url: process.env.SEPOLIA_TEST_RPC_URL!,
      accounts: [process.env.SEPOLIA_PRIVATE_KEY!],
    },
  },
};

export default config;
