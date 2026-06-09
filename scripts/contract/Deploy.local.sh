# Terminal 1 — local blockchain
npx hardhat node

# Terminal 2 — deploy to local
npx hardhat ignition deploy \
  ./ignition/modules/WowoIdeas.ts \
  --network localhost