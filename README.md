# Wowo Ideas Smart Contract (Experimental)

<div align="center">
  <img src="https://img.shields.io/badge/Solidity-%23363636.svg?style=for-the-badge&logo=solidity&logoColor=white">
  <img src="https://img.shields.io/badge/Hardhat-%23F8CC46.svg?style=for-the-badge&logo=hardhat&logoColor=black">
  <img src="https://img.shields.io/badge/TypeScript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white">
  <img src="https://img.shields.io/github/repo-size/ahmadfakhrulbawani2-arch/Wowo-Ideas-Smart-Contract-Experimental?style=for-the-badge&color=orange">
  <img src="https://img.shields.io/github/stars/ahmadfakhrulbawani2-arch/Wowo-Ideas-Smart-Contract-Experimental?style=for-the-badge&color=yellow">
  <img src="https://img.shields.io/github/forks/ahmadfakhrulbawani2-arch/Wowo-Ideas-Smart-Contract-Experimental?style=for-the-badge&color=purple">
</div>

<br /><br /><br />

<div align="center">
  <img src="./docs/WELCOME TO DASPROG.png"><br />
  <p>I LOVE WOWO SO FREAKING HARDD 😲😍🥰😘</p>
  <p>AKU PADAMUUU AHHHHH</p><br /><br />
</div>

Wowo Ideas is an experimental decentralized idea marketplace platform built on top of the Ethereum Virtual Machine (EVM). This smart contract allows users to publish their creative ideas onto the blockchain in a secure, state-protected proposal format. Innovators (_creators_) can monetize their intellectual property, while interested parties (_buyers_) can seamlessly fund or acquire the underlying details of the idea.

---

## 📌 Transaction Flow & Core Concepts

1. **Create & Collateral**: A _creator_ submits a new proposal. While the Title and Description are publicly viewable, the sensitive core details are stored in a protected state field. To ensure commitment, the creator must deposit a specific minimum amount of crypto as _collateral_.
2. **Accept & Reward**: Any user other than the creator (_buyer_) who is interested in the idea can buy it by sending a _reward_ amount equal to or greater than **110% of the proposal's collateral**. The contract immediately transfers both the initial collateral and the buyer's reward directly to the creator's wallet.
3. **Cancellation & Penalty**: Before the deadline hits, the _creator_ has the option to cancel a _Pending_ proposal. This action incurs a **10% penalty** deduction from the collateral, which is kept inside the contract as admin fees. The remaining 90% is refunded to the creator.
4. **Expiration & 100% Refund**: If a proposal passes its _deadline_ without being accepted by any buyer, the _creator_ can claim an expired state to safely retrieve 100% of their deposited collateral with no penalty fees.

---

### More detail

| Function Name          | Type               | Access Control   | Description                                                                    |
| :--------------------- | :----------------- | :--------------- | :----------------------------------------------------------------------------- |
| `createProposal`       | `external payable` | Anyone           | Deploys a new proposal requiring a deposit >= minimum collateral.              |
| `acceptProposal`       | `external payable` | Non-Creator Only | Acquires a pending proposal by matching a reward >= 110% collateral.           |
| `cancelProposal`       | `external`         | Creator Only     | Cancels an active proposal; extracts a 10% structural penalty.                 |
| `claimExpiredProposal` | `external`         | Creator Only     | Recovers 100% of the collateral if the proposal crosses the deadline unbought. |
| `getProposalDetail`    | `external view`    | Protected Gate   | Returns the hidden core idea string (Creator & verified Buyer only).           |
| `withdrawPenalties`    | `external`         | Contract Owner   | Collects accumulated cancellation penalties into the admin wallet.             |

## 🔐 Access Control & Intellectual Property Protection

The contract enforces strict cryptographic access control inside the `getProposalDetail` function to shield the idea's core value before a transaction occurs:

- **Creator**: Has unconditional access to read their own proposal's detail at any given time (whether the status is _Pending_ or _Accepted_).
- **Buyer**: Granted access to view the core detail _only after_ their purchasing transaction is successfully executed and confirmed (_Accepted_ state).
- **Third-Party / Unauthorized Wallets**: Any attempt to read the detail by an unverified third-party address will be immediately blocked and reverted by the EVM.

---

## 🛠️ Contract Architecture

### Data Structures & State Variables

```solidity
enum WowoProposalStatus { Pending, Accepted, Expired, Cancelled }

struct WowoProposal {
    uint256 id;
    address payable creator;
    address buyer;
    WowoProposalStatus status; // Packed layout for EVM gas optimization
    uint256 collateral;
    uint256 deadline;
    string title;
    string description;
    string detail; // Encapsulated sensitive idea detail
}
```

### Contract Contructor Variables

```ts
const min_collateral = 10000000000000n; // 0.00001 ETH or SepoliaETH, determine minimum proposal collateral
const expiration = 7n; // determine after how many days your proposal expired
```

### Contract Environment

Make sure to make .env for deployment. This is my env used for testnet sepolia only.

```bash
SEPOLIA_TEST_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com # example rpc
SEPOLIA_PRIVATE_KEY=
ETHERSCAN_API_KEY=
```

## 🏃‍➡️ How to run

### Prerequisites

1. Git
2. Text Editor
3. Node JS
4. MetaMask extension or other crypto e-wallet
5. Etherscan API Key and wallet deployment private key

### Step by Step

1. Create new repository and enter into that, then run this:

```bash
git clone https://github.com/ahmadfakhrulbawani2-arch/Wowo-Ideas-Smart-Contract-Experimental.git .
```

2. Install dependencies:

```bash
pnpm install
```

3. Compile the contract

```bash
pnpm compile
```

4. Deployment can be divided into local and real blockchain. Please read instruction below:

```bash
# to run locally run this
pnpm dev

# to deploy on real blockchain, but this time I use testnet of sepolia
# 1st time deployment
pnpm deployTestWowoIdeas
# if you already have it, run this
pnpm resetWowo
```

5. For the sake of debugging, please run the test and specify spesific file to test. You can write to main test in [here](./test/WowoIdeas.ts) but it's good to have multiple file.

```bash
pnpm test
```

## ℹ️ Contributing to This Repo

1. After running the How to Run, create new branch

```bash
git checkout -b <your_branch_name>
```

2. Make your changes and publish the branch.
3. Make pull request in Github or thhrough your prefered way.
4. Creating issue is also preferred.

## 🖼️ Documentation

Coming soon.

## 📈 Further Development

Building Front-end and back-end coming soon.

📜 License
This project is licensed under the MIT License. Feel free to use, modify, and distribute it for educational or experimental Web3 development.

---

Developed with 💻 and 💖 by Ahmad Fakhrul Bawani
