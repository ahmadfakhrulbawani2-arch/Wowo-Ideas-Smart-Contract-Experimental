import { describe, it } from "node:test";
import assert from "node:assert/strict";
import hre from "hardhat";

const { viem } = await hre.network.create();

// Note
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
        string title;
        string description;
        uint256 collateral;
        uint256 deadline;
        WowoProposalStatus status;
    }

    Bro, i dont know wtf uint256 in typescripts, so i stick without struct
 */

describe("WowoIdeas", () => {
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
    const [testTitle, testDesc] = [
      "Web Himasakta",
      "Bikin frontend pakai Next.JS, Tailwind and GO",
    ];
    await contractAsCreator.write.createProposal([testTitle, testDesc], {
      value: MinCollateral,
    });
    assert.equal(await WowoIdeas.read.getProposalCount(), 1n);

    const [id, proposalCreator, title, desc, collateral, , status] =
      await WowoIdeas.read.getProposalById([1n]);
    assert.equal(id, 1n);
    assert.equal(
      proposalCreator.toLowerCase(),
      creator.account.address.toLowerCase(),
    );
    assert.equal(title, testTitle);
    assert.equal(desc, testDesc);
    assert.equal(collateral, MinCollateral);
    assert.equal(status, 0);

    // almost forgot, check creator balance after creation
    const pastCreatorBalance = await PublicClient.getBalance({
      address: creator.account.address,
    });
    assert.equal(pastCreatorBalance, earlyCreatorBalance - MinCollateral);
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

    const [testTitle, testDesc] = [
      "Ide bisnis",
      "Hai ini deskripsi ide bisnis saya",
    ];
    await contractAsCreator.write.createProposal([testTitle, testDesc], {
      value: MinCollateral,
    });
    const requiredReward = (MinCollateral * 110n) / 110n;

    // we want to check how creator and reviewer balance is changing
    const earlyCreatorBalance = await PublicClient.getBalance({
      address: creator.account.address,
    });
    const earlyReviewerBalance = await PublicClient.getBalance({
      address: reviewer.account.address,
    });

    await contractAsReviewer.write.acceptProposal([1n], {
      value: requiredReward,
    });

    const [, , , , , , status] = await WowoIdeas.read.getProposalById([1n]);
    assert.equal(status, 1);

    const pastCreatorBalance = await PublicClient.getBalance({
      address: creator.account.address,
    });
    assert.equal(
      pastCreatorBalance,
      earlyCreatorBalance + MinCollateral + requiredReward,
    );
    const pastReviewerBalance = await PublicClient.getBalance({
      address: reviewer.account.address,
    });
    assert.equal(pastReviewerBalance, earlyReviewerBalance - requiredReward);
  });
});
