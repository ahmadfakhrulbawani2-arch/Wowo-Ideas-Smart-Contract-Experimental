// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
    This is experimental smart contract created by Ahmad Fakhrul Bawani.
    The core concept of this smart contract is just basic CRUD of ideas.
    The user can create a some proposals that share his/her ideas to blockchain.
    The user that create proposal will have creator permission
    The creator have permission to create and delete their proposal. 
    To create proposal, creator must pay spesific collateral as a price and commitment for their proposal.
    To delete (cancel) proposal, creator will only refunded 90% of the proposal collateral, other 10% used for penalty.
    Other user except the creator can only accept some proposals.
    To accept, they need to pay the reward for the creator that is >= 110% of the proposal collateral, they can send more as donation and support for creator.
    After some time, if a proposal is not accepted yet, it can be claimed and the proposal collateral is refunded 100% to creator.
*/

contract WowoIdeas {
    // == proposal status
    enum WowoProposalStatus {
        Pending,
        Accepted,
        Expired,
        Cancelled
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

    // === Smart contract rules ===
    address public Owner;
    uint256 public Proposal_min_collateral;
    uint256 public Proposal_duration;

    constructor(uint256 _min_collateral, uint256 _duration) {
        Owner = msg.sender;
        Proposal_min_collateral = _min_collateral;
        Proposal_duration = _duration * 1 days;
    }

    uint256 public Proposal_count;
    mapping(uint256 => WowoProposal) public Proposals;

    // === Smart contract event list
    event ProposalCreated(
        uint256 indexed id,
        address creator,
        string title,
        uint256 collateral,
        uint256 deadline
    );
    event ProposalAccepted(
        uint256 indexed id,
        address reviewer,
        uint256 reward
    );
    event ProposalCancelled(
        uint256 indexed id,
        uint256 refunded,
        uint256 penalty
    );
    event ProposalClaimed(uint256 indexed id, uint256 refunded);

    // === Smart contract detailed event list

    // 1. CREATE: create a proposal
    
}
