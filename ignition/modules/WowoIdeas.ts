import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const WowoIdeas = buildModule("WowoIdeasModule", (m) => {
  // WARNING ADMIN PERMISSION
  // !CHANGETHIS TO YOUR OWN RULES
  const min_collateral = 10000000000000n; // 0.00001 ETH or SepoliaETH
  const expiration = 7n;
  const board = m.contract("WowoIdeas", [min_collateral, expiration]);
  return { board };
});

export default WowoIdeas;
