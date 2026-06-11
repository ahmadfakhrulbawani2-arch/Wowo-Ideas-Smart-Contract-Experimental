import { describe, it } from "node:test";
import assert from "node:assert/strict";
import hre from "hardhat";

const { networkHelpers, viem } = await hre.network.create();
const blockTime = networkHelpers.time;

// Note:
// All normal testcase transaction are within minimum requirement first
/**
    enum WowoProposalStatus {
        Pending, // 0
        Accepted, // 1
        Expired, // 2
        Cancelled // 3
    }

    // === Proposal data structures ===
    struct WowoProposal {
        uint256 id;
        address payable creator;
        address buyer;
        WowoProposalStatus status;
        uint256 collateral;
        uint256 deadline;
        string title;
        string description;
        string detail;
    }

    Bro, i dont know wtf uint256 in typescripts, so i stick without struct
 */

describe("WowoIdeasIdeas Testing", () => {
  async function DeployWowoIdeas() {
    const [owner, creator, reviewer] = await viem.getWalletClients();

    const MinCollateral = 10000000000000n; // 0.00001 ETH
    const DurationExpiredInDays = 7n;

    const WowoIdeas = await viem.deployContract("WowoIdeas", [
      MinCollateral,
      DurationExpiredInDays,
    ]);

    const PublicClient = await viem.getPublicClient();
    return { WowoIdeas, owner, creator, reviewer, MinCollateral, PublicClient };
  }

  // === Normal Test case ===

  // 1. deployement
  it("Must initialize contract rule correctly", async () => {
    const { WowoIdeas, owner, MinCollateral } = await DeployWowoIdeas();

    const contractOwner = await WowoIdeas.read.Owner();
    assert.equal(
      contractOwner.toLowerCase(),
      owner.account.address.toLowerCase(),
    );

    const currentMinCollateral = await WowoIdeas.read.Proposal_min_collateral();
    assert.equal(currentMinCollateral, MinCollateral);

    const currentDuration = await WowoIdeas.read.Proposal_duration();
    assert.equal(currentDuration, 7n * 24n * 60n * 60n);
  });

  // 2. Proposal creation
  it("Creator can create new proposal if creator wallet enough to pay collateral", async () => {
    const { WowoIdeas, creator, MinCollateral, PublicClient } =
      await DeployWowoIdeas();

    const contractAsCreator = await viem.getContractAt(
      "WowoIdeas",
      WowoIdeas.address,
      {
        client: {
          wallet: creator,
        },
      },
    );

    // we want to check creator balance before and after creation, almost forgot
    const earlyCreatorBalance = await PublicClient.getBalance({
      address: creator.account.address,
    });

    // proposal creation here
    const [testTitle, testDesc, testDetail] = [
      "Web Himasakta",
      "Bikin frontend pakai Next.JS, Tailwind and GO",
      "Ini detail proposal lengkap ditaruh di sini",
    ];

    const hash = await contractAsCreator.write.createProposal(
      [testTitle, testDesc, testDetail],
      {
        value: MinCollateral,
      },
    );
    const receipt = await PublicClient.waitForTransactionReceipt({ hash });
    const gasUsed = receipt.gasUsed * receipt.effectiveGasPrice;

    assert.equal(await WowoIdeas.read.getProposalCount(), 1n);

    // Menyesuaikan susunan return getProposalById terkini (8 return value)
    const [id, proposalCreator, buyer, title, desc, collateral, , status] =
      await WowoIdeas.read.getProposalById([1n]);

    assert.equal(id, 1n);
    assert.equal(
      proposalCreator.toLowerCase(),
      creator.account.address.toLowerCase(),
    );
    assert.equal(buyer, "0x0000000000000000000000000000000000000000");
    assert.equal(title, testTitle);
    assert.equal(desc, testDesc);
    assert.equal(collateral, MinCollateral);
    assert.equal(status, 0);

    // almost forgot, check creator balance after creation
    const pastCreatorBalance = await PublicClient.getBalance({
      address: creator.account.address,
    });
    // Harus dikurangi gasUsed dari transaksi pembuatan proposal agar tes akurat
    assert.equal(
      pastCreatorBalance,
      earlyCreatorBalance - MinCollateral - gasUsed,
    );
  });

  // 3. Proposal acception
  it("Other user can accept proposal if paying >= 110% collateral", async () => {
    const { WowoIdeas, creator, reviewer, MinCollateral, PublicClient } =
      await DeployWowoIdeas();
    const contractAsCreator = await viem.getContractAt(
      "WowoIdeas",
      WowoIdeas.address,
      { client: { wallet: creator } },
    );
    const contractAsReviewer = await viem.getContractAt(
      "WowoIdeas",
      WowoIdeas.address,
      { client: { wallet: reviewer } },
    );

    const [testTitle, testDesc, testDetail] = [
      "Ide bisnis",
      "Hai ini deskripsi ide bisnis saya",
      "Ini detail rahasia bisnis",
    ];

    const createHash = await contractAsCreator.write.createProposal(
      [testTitle, testDesc, testDetail],
      {
        value: MinCollateral,
      },
    );
    await PublicClient.waitForTransactionReceipt({ hash: createHash });

    // FIX BUG: Sebelumnya dibagi 110n, harusnya dikali 110n lalu dibagi 100n (110%)
    const requiredReward = (MinCollateral * 110n) / 100n;

    // we want to check how creator and reviewer balance is changing
    const earlyCreatorBalance = await PublicClient.getBalance({
      address: creator.account.address,
    });
    const earlyReviewerBalance = await PublicClient.getBalance({
      address: reviewer.account.address,
    });

    const acceptHash = await contractAsReviewer.write.acceptProposal([1n], {
      value: requiredReward,
    });
    const acceptReceipt = await PublicClient.waitForTransactionReceipt({
      hash: acceptHash,
    });
    const reviewerGasUsed =
      acceptReceipt.gasUsed * acceptReceipt.effectiveGasPrice;

    const [, , , , , , , status] = await WowoIdeas.read.getProposalById([1n]);
    assert.equal(status, 1);

    const pastCreatorBalance = await PublicClient.getBalance({
      address: creator.account.address,
    });
    // Creator menerima collateral lamanya kembali + reward baru dari reviewer
    assert.equal(
      pastCreatorBalance,
      earlyCreatorBalance + MinCollateral + requiredReward,
    );

    const pastReviewerBalance = await PublicClient.getBalance({
      address: reviewer.account.address,
    });
    assert.equal(
      pastReviewerBalance,
      earlyReviewerBalance - requiredReward - reviewerGasUsed,
    );
  });

  // 4. Proposal cancellation
  it("Creator can cancel proposal before deadline and got 10% collateral penalty", async () => {
    const { WowoIdeas, creator, MinCollateral, PublicClient } =
      await DeployWowoIdeas();
    const contractAsCreator = await viem.getContractAt(
      "WowoIdeas",
      WowoIdeas.address,
      { client: { wallet: creator } },
    );
    const [testTitle, testDesc, testDetail] = [
      "Coba cancel",
      "Proposal ini mau dicancel bang",
      "Detail cancel",
    ];

    // creator create proposal
    const createHash = await contractAsCreator.write.createProposal(
      [testTitle, testDesc, testDetail],
      {
        value: MinCollateral,
      },
    );
    await PublicClient.waitForTransactionReceipt({ hash: createHash });

    // get creator balance before cancellation
    const earlyCreatorBalance = await PublicClient.getBalance({
      address: creator.account.address,
    });

    const hashCode = await contractAsCreator.write.cancelProposal([1n]);
    const receipt = await PublicClient.waitForTransactionReceipt({
      hash: hashCode,
    });
    const gasUsed = receipt.gasUsed * receipt.effectiveGasPrice;

    // calc penalty
    const penalty = (MinCollateral * 10n) / 100n;
    const trueRefund = MinCollateral - penalty - gasUsed;

    // check past balance of creator
    const pastCreatorBalance = await PublicClient.getBalance({
      address: creator.account.address,
    });
    assert.equal(pastCreatorBalance, earlyCreatorBalance + trueRefund);

    // check proposal status
    const [, , , , , , , status] = await WowoIdeas.read.getProposalById([1n]);
    assert.equal(status, 3);
  });

  it("Creator can claim 100% refund if proposal is expired", async () => {
    const { WowoIdeas, creator, MinCollateral, PublicClient } =
      await DeployWowoIdeas();
    const contractAsCreator = await viem.getContractAt(
      "WowoIdeas",
      WowoIdeas.address,
      { client: { wallet: creator } },
    );
    const [testTitle, testDesc, testDetail] = [
      "Mau dibiarin gan",
      "Biarkan saja namanya juga kehidupan",
      "Detail kehidupan",
    ];

    const createHash = await contractAsCreator.write.createProposal(
      [testTitle, testDesc, testDetail],
      {
        value: MinCollateral,
      },
    );
    await PublicClient.waitForTransactionReceipt({ hash: createHash });

    // Fast-forward waktu sejauh 8 hari agar status proposal expired di blockchain node
    await blockTime.increase(8n * 24n * 60n * 60n);

    // balance check
    const earlyCreatorBalance = await PublicClient.getBalance({
      address: creator.account.address,
    });

    const hashCode = await contractAsCreator.write.claimExpiredProposal([1n]);
    const receipt = await PublicClient.waitForTransactionReceipt({
      hash: hashCode,
    });
    const gasUsed = receipt.gasUsed * receipt.effectiveGasPrice;

    const pastCreatorBalance = await PublicClient.getBalance({
      address: creator.account.address,
    });
    assert.equal(
      pastCreatorBalance,
      earlyCreatorBalance + MinCollateral - gasUsed,
    );
    const [, , , , , , , status] = await WowoIdeas.read.getProposalById([1n]);
    assert.equal(status, 2);
  });
});
