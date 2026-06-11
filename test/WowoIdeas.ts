/**
 * REFACTORED BY GEMINI 3.1 FLASH. THANK YOU SO MUCHHHHHH
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import hre from "hardhat";

const { networkHelpers, viem } = await hre.network.create();
const blockTime = networkHelpers.time;

/**
    enum WowoProposalStatus {
        Pending, // 0
        Accepted, // 1
        Expired, // 2
        Cancelled // 3
    }
    Bro, i dont know wtf uint256 in typescripts, so i stick without struct
 */

describe("WowoIdeas Testing Suite", () => {
  // Shared Deployment Setup
  async function DeployWowoIdeas() {
    const [owner, creator, reviewer, other] = await viem.getWalletClients();
    const MinCollateral = 10000000000000n; // 0.00001 ETH
    const DurationExpiredInDays = 7n;

    const WowoIdeas = await viem.deployContract("WowoIdeas", [
      MinCollateral,
      DurationExpiredInDays,
    ]);

    const PublicClient = await viem.getPublicClient();
    return {
      WowoIdeas,
      owner,
      creator,
      reviewer,
      other,
      MinCollateral,
      PublicClient,
    };
  }

  // =========================================================================
  // 1. DEPLOYMENT & INITIALIZATION
  // =========================================================================
  describe("Contract Deployment", () => {
    async function setup() {
      const ctx = await DeployWowoIdeas();
      const contractOwner = await ctx.WowoIdeas.read.Owner();
      const currentMinCollateral =
        await ctx.WowoIdeas.read.Proposal_min_collateral();
      const currentDuration = await ctx.WowoIdeas.read.Proposal_duration();
      return { ...ctx, contractOwner, currentMinCollateral, currentDuration };
    }

    it("should set the correct contract owner", async () => {
      const { contractOwner, owner } = await setup();
      assert.equal(
        contractOwner.toLowerCase(),
        owner.account.address.toLowerCase(),
      );
    });

    it("should set the correct minimum collateral limit", async () => {
      const { currentMinCollateral, MinCollateral } = await setup();
      assert.equal(currentMinCollateral, MinCollateral);
    });

    it("should set the correct expiration duration in seconds", async () => {
      const { currentDuration } = await setup();
      assert.equal(currentDuration, 7n * 24n * 60n * 60n);
    });
  });

  // =========================================================================
  // 2. PROPOSAL CREATION
  // =========================================================================
  describe("Function: createProposal", () => {
    async function setupCreation() {
      const ctx = await DeployWowoIdeas();
      const contractAsCreator = await viem.getContractAt(
        "WowoIdeas",
        ctx.WowoIdeas.address,
        {
          client: { wallet: ctx.creator },
        },
      );

      const earlyCreatorBalance = await ctx.PublicClient.getBalance({
        address: ctx.creator.account.address,
      });

      const [testTitle, testDesc, testDetail] = [
        "Web Himasakta",
        "Bikin frontend pakai Next.JS, Tailwind and GO",
        "Ini detail proposal lengkap ditaruh di sini",
      ];

      const hash = await contractAsCreator.write.createProposal(
        [testTitle, testDesc, testDetail],
        {
          value: ctx.MinCollateral,
        },
      );
      const receipt = await ctx.PublicClient.waitForTransactionReceipt({
        hash,
      });
      const gasUsed = receipt.gasUsed * receipt.effectiveGasPrice;

      const proposalCount = await ctx.WowoIdeas.read.getProposalCount();
      const proposalData = await ctx.WowoIdeas.read.getProposalById([1n]);
      const pastCreatorBalance = await ctx.PublicClient.getBalance({
        address: ctx.creator.account.address,
      });

      return {
        ...ctx,
        proposalCount,
        proposalData,
        earlyCreatorBalance,
        pastCreatorBalance,
        gasUsed,
        testTitle,
        testDesc,
      };
    }

    describe("Success Cases", () => {
      it("should increment the global proposal count registry", async () => {
        const { proposalCount } = await setupCreation();
        assert.equal(proposalCount, 1n);
      });

      it("should assign the correct incremental ID to the proposal", async () => {
        const { proposalData } = await setupCreation();
        assert.equal(proposalData[0], 1n);
      });

      it("should register the caller address as the proposal creator", async () => {
        const { proposalData, creator } = await setupCreation();
        assert.equal(
          proposalData[1].toLowerCase(),
          creator.account.address.toLowerCase(),
        );
      });

      it("should initialize the proposal buyer with an empty null address", async () => {
        const { proposalData } = await setupCreation();
        assert.equal(
          proposalData[2],
          "0x0000000000000000000000000000000000000000",
        );
      });

      it("should store the correct proposal title text", async () => {
        const { proposalData, testTitle } = await setupCreation();
        assert.equal(proposalData[3], testTitle);
      });

      it("should store the correct proposal description text", async () => {
        const { proposalData, testDesc } = await setupCreation();
        assert.equal(proposalData[4], testDesc);
      });

      it("should lock the exact sent value inside proposal collateral", async () => {
        const { proposalData, MinCollateral } = await setupCreation();
        assert.equal(proposalData[5], MinCollateral);
      });

      it("should initialize status as 0 (Pending)", async () => {
        const { proposalData } = await setupCreation();
        assert.equal(proposalData[7], 0);
      });

      it("should charge the exact collateral and gas fee from creator's wallet", async () => {
        const {
          pastCreatorBalance,
          earlyCreatorBalance,
          MinCollateral,
          gasUsed,
        } = await setupCreation();
        assert.equal(
          pastCreatorBalance,
          earlyCreatorBalance - MinCollateral - gasUsed,
        );
      });
    });

    describe("Validation Cases", () => {
      it("should revert if user sends collateral lower than contract rule minimum", async () => {
        const { WowoIdeas, creator, MinCollateral } = await DeployWowoIdeas();
        const contractAsCreator = await viem.getContractAt(
          "WowoIdeas",
          WowoIdeas.address,
          {
            client: { wallet: creator },
          },
        );

        try {
          await contractAsCreator.write.createProposal(
            ["Title", "Desc", "Detail"],
            {
              value: MinCollateral - 1n,
            },
          );
          assert.fail("Execution should fail due to low collateral");
        } catch (error: any) {
          assert.match(
            error.message,
            /Can't input collateral < smart contract minimum collateral/,
          );
        }
      });
    });
  });

  // =========================================================================
  // 3. PROPOSAL ACCEPTANCE
  // =========================================================================
  describe("Function: acceptProposal", () => {
    async function setupAcceptance() {
      const ctx = await DeployWowoIdeas();
      const contractAsCreator = await viem.getContractAt(
        "WowoIdeas",
        ctx.WowoIdeas.address,
        {
          client: { wallet: ctx.creator },
        },
      );
      const contractAsReviewer = await viem.getContractAt(
        "WowoIdeas",
        ctx.WowoIdeas.address,
        {
          client: { wallet: ctx.reviewer },
        },
      );

      const createHash = await contractAsCreator.write.createProposal(
        ["Ide", "Desc", "Detail"],
        {
          value: ctx.MinCollateral,
        },
      );
      await ctx.PublicClient.waitForTransactionReceipt({ hash: createHash });

      const requiredReward = (ctx.MinCollateral * 110n) / 100n;

      const earlyCreatorBalance = await ctx.PublicClient.getBalance({
        address: ctx.creator.account.address,
      });
      const earlyReviewerBalance = await ctx.PublicClient.getBalance({
        address: ctx.reviewer.account.address,
      });

      const acceptHash = await contractAsReviewer.write.acceptProposal([1n], {
        value: requiredReward,
      });
      const acceptReceipt = await ctx.PublicClient.waitForTransactionReceipt({
        hash: acceptHash,
      });
      const reviewerGasUsed =
        acceptReceipt.gasUsed * acceptReceipt.effectiveGasPrice;

      const proposalData = await ctx.WowoIdeas.read.getProposalById([1n]);
      const pastCreatorBalance = await ctx.PublicClient.getBalance({
        address: ctx.creator.account.address,
      });
      const pastReviewerBalance = await ctx.PublicClient.getBalance({
        address: ctx.reviewer.account.address,
      });

      return {
        ...ctx,
        proposalData,
        requiredReward,
        earlyCreatorBalance,
        earlyReviewerBalance,
        pastCreatorBalance,
        pastReviewerBalance,
        reviewerGasUsed,
        contractAsCreator,
        contractAsReviewer,
      };
    }

    describe("Success Cases", () => {
      it("should flip status to 1 (Accepted) after successful funding", async () => {
        const { proposalData } = await setupAcceptance();
        assert.equal(proposalData[7], 1);
      });

      it("should update buyer field with the reviewer's address", async () => {
        const { proposalData, reviewer } = await setupAcceptance();
        assert.equal(
          proposalData[2].toLowerCase(),
          reviewer.account.address.toLowerCase(),
        );
      });

      it("should route the collateral refund plus reward premium back to creator", async () => {
        const {
          pastCreatorBalance,
          earlyCreatorBalance,
          MinCollateral,
          requiredReward,
        } = await setupAcceptance();
        assert.equal(
          pastCreatorBalance,
          earlyCreatorBalance + MinCollateral + requiredReward,
        );
      });

      it("should deduct exact reward package and processing gas from reviewer's wallet", async () => {
        const {
          pastReviewerBalance,
          earlyReviewerBalance,
          requiredReward,
          reviewerGasUsed,
        } = await setupAcceptance();
        assert.equal(
          pastReviewerBalance,
          earlyReviewerBalance - requiredReward - reviewerGasUsed,
        );
      });
    });

    describe("Validation Cases", () => {
      it("should revert if creator tries to accept their own open proposal", async () => {
        const { contractAsCreator, MinCollateral } = await setupAcceptance();

        // Buat proposal baru (ID 2n) yang statusnya masih Pending
        const hash = await contractAsCreator.write.createProposal(
          ["Judul Baru", "Desc", "Detail"],
          { value: MinCollateral },
        );
        const PublicClient = await viem.getPublicClient();
        await PublicClient.waitForTransactionReceipt({ hash });

        try {
          // Coba accept proposal milik sendiri (ID 2n)
          await contractAsCreator.write.acceptProposal([2n], {
            value: (MinCollateral * 110n) / 100n,
          });
          assert.fail("Execution should fail when creator matches reviewer");
        } catch (error: any) {
          assert.match(error.message, /Can't accept your own proposal/);
        }
      });

      it("should revert if processing value is strictly less than 110% premium threshold", async () => {
        const { contractAsCreator, contractAsReviewer, MinCollateral } =
          await setupAcceptance();

        // Buat proposal baru (ID 2n) yang statusnya masih Pending
        const hash = await contractAsCreator.write.createProposal(
          ["Judul Baru 2", "Desc", "Detail"],
          { value: MinCollateral },
        );
        const PublicClient = await viem.getPublicClient();
        await PublicClient.waitForTransactionReceipt({ hash });

        const badReward = (MinCollateral * 110n) / 100n - 1n;
        try {
          // Tembak proposal baru (ID 2n) dengan dana kurang
          await contractAsReviewer.write.acceptProposal([2n], {
            value: badReward,
          });
          assert.fail("Execution should fail due to low premium reward");
        } catch (error: any) {
          assert.match(error.message, /Can't reward < 110% collateral/);
        }
      });
    });
  });

  // =========================================================================
  // 4. PROPOSAL CANCELLATION
  // =========================================================================
  describe("Function: cancelProposal", () => {
    async function setupCancellation() {
      const ctx = await DeployWowoIdeas();
      const contractAsCreator = await viem.getContractAt(
        "WowoIdeas",
        ctx.WowoIdeas.address,
        {
          client: { wallet: ctx.creator },
        },
      );

      const createHash = await contractAsCreator.write.createProposal(
        ["Cancel", "Desc", "Detail"],
        {
          value: ctx.MinCollateral,
        },
      );
      await ctx.PublicClient.waitForTransactionReceipt({ hash: createHash });

      const earlyCreatorBalance = await ctx.PublicClient.getBalance({
        address: ctx.creator.account.address,
      });

      const hashCode = await contractAsCreator.write.cancelProposal([1n]);
      const receipt = await ctx.PublicClient.waitForTransactionReceipt({
        hash: hashCode,
      });
      const gasUsed = receipt.gasUsed * receipt.effectiveGasPrice;

      const penalty = (ctx.MinCollateral * 10n) / 100n;
      const trueRefund = ctx.MinCollateral - penalty - gasUsed;

      const proposalData = await ctx.WowoIdeas.read.getProposalById([1n]);
      const pastCreatorBalance = await ctx.PublicClient.getBalance({
        address: ctx.creator.account.address,
      });

      return {
        ...ctx,
        proposalData,
        pastCreatorBalance,
        earlyCreatorBalance,
        trueRefund,
      };
    }

    describe("Success Cases", () => {
      it("should shift proposal status to 3 (Cancelled)", async () => {
        const { proposalData } = await setupCancellation();
        assert.equal(proposalData[7], 3);
      });

      it("should deliver a 90% partial refund minus transaction gas back to creator", async () => {
        const { pastCreatorBalance, earlyCreatorBalance, trueRefund } =
          await setupCancellation();
        assert.equal(pastCreatorBalance, earlyCreatorBalance + trueRefund);
      });
    });
  });

  // =========================================================================
  // 5. CLAIM EXPIRED PROPOSALS
  // =========================================================================
  describe("Function: claimExpiredProposal", () => {
    async function setupExpiration() {
      const ctx = await DeployWowoIdeas();
      const contractAsCreator = await viem.getContractAt(
        "WowoIdeas",
        ctx.WowoIdeas.address,
        {
          client: { wallet: ctx.creator },
        },
      );

      const createHash = await contractAsCreator.write.createProposal(
        ["Expire", "Desc", "Detail"],
        {
          value: ctx.MinCollateral,
        },
      );
      await ctx.PublicClient.waitForTransactionReceipt({ hash: createHash });

      // Fast forward timeline past the contract duration boundaries
      await blockTime.increase(8n * 24n * 60n * 60n);

      const earlyCreatorBalance = await ctx.PublicClient.getBalance({
        address: ctx.creator.account.address,
      });

      const hashCode = await contractAsCreator.write.claimExpiredProposal([1n]);
      const receipt = await ctx.PublicClient.waitForTransactionReceipt({
        hash: hashCode,
      });
      const gasUsed = receipt.gasUsed * receipt.effectiveGasPrice;

      const proposalData = await ctx.WowoIdeas.read.getProposalById([1n]);
      const pastCreatorBalance = await ctx.PublicClient.getBalance({
        address: ctx.creator.account.address,
      });

      return {
        ...ctx,
        proposalData,
        pastCreatorBalance,
        earlyCreatorBalance,
        gasUsed,
      };
    }

    describe("Success Cases", () => {
      it("should assign terminal status of 2 (Expired) to the target id record", async () => {
        const { proposalData } = await setupExpiration();
        assert.equal(proposalData[7], 2);
      });

      it("should process a clean 100% collateral refund minus execution gas to creator", async () => {
        const {
          pastCreatorBalance,
          earlyCreatorBalance,
          MinCollateral,
          gasUsed,
        } = await setupExpiration();
        assert.equal(
          pastCreatorBalance,
          earlyCreatorBalance + MinCollateral - gasUsed,
        );
      });
    });
  });
  // =========================================================================
  // 6. GETTER / READ FUNCTIONS TESTING
  // =========================================================================
  describe("Getter Functions", () => {
    // Helper setup khusus untuk memancit data awal agar bisa dibaca
    async function setupGetters() {
      const ctx = await DeployWowoIdeas();
      const contractAsCreator = await viem.getContractAt(
        "WowoIdeas",
        ctx.WowoIdeas.address,
        {
          client: { wallet: ctx.creator },
        },
      );
      const contractAsReviewer = await viem.getContractAt(
        "WowoIdeas",
        ctx.WowoIdeas.address,
        {
          client: { wallet: ctx.reviewer },
        },
      );

      const [testTitle, testDesc, testDetail] = [
        "Judul Tes",
        "Deskripsi Tes",
        "Detail Rahasia",
      ];

      // 1. Buat Proposal ID 1n (Akan dibiarkan Pending)
      const hash1 = await contractAsCreator.write.createProposal(
        [testTitle, testDesc, testDetail],
        {
          value: ctx.MinCollateral,
        },
      );
      await ctx.PublicClient.waitForTransactionReceipt({ hash: hash1 });

      // 2. Buat Proposal ID 2n (Akan langsung di-accept oleh Reviewer/Buyer)
      const hash2 = await contractAsCreator.write.createProposal(
        ["Proposal Dua", "Desc", "Detail 2"],
        {
          value: ctx.MinCollateral,
        },
      );
      await ctx.PublicClient.waitForTransactionReceipt({ hash: hash2 });

      const requiredReward = (ctx.MinCollateral * 110n) / 100n;
      const acceptHash = await contractAsReviewer.write.acceptProposal([2n], {
        value: requiredReward,
      });
      await ctx.PublicClient.waitForTransactionReceipt({ hash: acceptHash });

      return {
        ...ctx,
        contractAsCreator,
        contractAsReviewer,
        testTitle,
        testDesc,
        testDetail,
      };
    }

    // --- Testing getProposalCount ---
    describe("Function: getProposalCount", () => {
      it("should return 0 when no proposals have been created yet", async () => {
        const { WowoIdeas } = await DeployWowoIdeas();
        const count = await WowoIdeas.read.getProposalCount();
        assert.equal(count, 0n);
      });

      it("should return the exact total number of registered proposals", async () => {
        const { WowoIdeas } = await setupGetters();
        const count = await WowoIdeas.read.getProposalCount();
        assert.equal(count, 2n); // Karena kita buat 2 proposal di setup
      });
    });

    // --- Testing getProposalById ---
    describe("Function: getProposalById", () => {
      it("should revert if fetching a non-existent lower-bound proposal ID (0n)", async () => {
        const { WowoIdeas } = await setupGetters();
        try {
          await WowoIdeas.read.getProposalById([0n]);
          assert.fail("Should fail for ID 0");
        } catch (error: any) {
          assert.match(error.message, /Proposal don't exist/);
        }
      });

      it("should revert if fetching an out-of-bounds higher proposal ID", async () => {
        const { WowoIdeas } = await setupGetters();
        try {
          await WowoIdeas.read.getProposalById([99n]);
          assert.fail("Should fail for non-existent ID");
        } catch (error: any) {
          assert.match(error.message, /Proposal don't exist/);
        }
      });

      it("should return correct structural metadata for a valid proposal ID", async () => {
        const { WowoIdeas, creator, testTitle, testDesc, MinCollateral } =
          await setupGetters();
        const data = await WowoIdeas.read.getProposalById([1n]);

        assert.equal(data[0], 1n); // id
        assert.equal(
          data[1].toLowerCase(),
          creator.account.address.toLowerCase(),
        ); // creator
        assert.equal(data[3], testTitle); // title
        assert.equal(data[4], testDesc); // description
        assert.equal(data[5], MinCollateral); // collateral
        assert.equal(data[7], 0); // status (0 = Pending)
      });
    });
    // --- Testing getProposalDetail ---
    describe("Function: getProposalDetail", () => {
      describe("Success Cases", () => {
        it("should allow the creator to read the proposal detail text", async () => {
          const { WowoIdeas, creator } = await setupGetters();

          // ID 2n di setup memiliki detail "Detail 2"
          const detail = await WowoIdeas.read.getProposalDetail([2n], {
            account: creator.account,
          });
          assert.equal(detail, "Detail 2");
        });

        it("should allow the verified buyer/reviewer to read the proposal detail text", async () => {
          const { WowoIdeas, reviewer } = await setupGetters();

          const detail = await WowoIdeas.read.getProposalDetail([2n], {
            account: reviewer.account,
          });
          assert.equal(detail, "Detail 2");
        });
      });

      describe("Validation & Access Control Cases", () => {
        it("should revert if the proposal status is still Pending & not accessed by the buyer nor creator", async () => {
          const { WowoIdeas, other } = await setupGetters();

          let threwError = false;
          try {
            // ID 1n statusnya masih Pending di helper setup
            await WowoIdeas.read.getProposalDetail([1n], {
              account: other.account,
            });
          } catch (error: any) {
            threwError = true;
            assert.match(error.message, /Can't access proposal detail/);
          }

          if (!threwError) {
            assert.fail("Should fail because status is not Accepted");
          }
        });

        it("should revert if accessed by an unverified third-party wallet address like owner", async () => {
          const { WowoIdeas, owner } = await setupGetters();

          let threwError = false;
          try {
            await WowoIdeas.read.getProposalDetail([2n], {
              account: owner.account,
            });
          } catch (error: any) {
            threwError = true;
            assert.match(error.message, /Can't access proposal detail/);
          }

          if (!threwError) {
            assert.fail("Should block unauthorized third party");
          }
        });
      });
    });
  });
});
