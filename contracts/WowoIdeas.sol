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
    function createProposal(
        string calldata _title,
        string calldata _description
    ) external payable {
        require(
            msg.value >= Proposal_min_collateral,
            "Can't input collateral < smart contract minimum collateral"
        );

        uint256 _deadline = block.timestamp + Proposal_duration;
        Proposal_count++;

        Proposals[Proposal_count] = WowoProposal({
            id: Proposal_count,
            creator: payable(msg.sender),
            title: _title,
            description: _description,
            collateral: msg.value,
            deadline: _deadline,
            status: WowoProposalStatus.Pending
        });

        emit ProposalCreated(
            Proposal_count,
            msg.sender,
            _title,
            msg.value,
            _deadline
        );
    }

    // 2. UPDATE: accepting proposal
    function acceptProposal(uint256 _id) external payable {
        // _id must valid, there's no id 0 as the first proposal id is 1
        require(_id > 0 && _id <= Proposal_count, "Proposal don't exist");

        WowoProposal storage proposal = Proposals[_id];

        require(
            msg.sender != proposal.creator,
            "Can't accept your own proposal"
        );
        require(
            proposal.status == WowoProposalStatus.Pending,
            "Can only accept pending status proposal"
        );
        require(
            block.timestamp <= proposal.deadline,
            "Can't accept expired proposal"
        );

        // min required reward is 110%
        uint256 requiredReward = (proposal.collateral * 110) / 100;
        require(msg.value >= requiredReward, "Can't reward < 110% collateral");

        // transfer & update data
        proposal.status = WowoProposalStatus.Accepted;
        uint256 totalFund = proposal.collateral + msg.value;
        (bool success, ) = proposal.creator.call{value: totalFund}("");
        require(success, "Transfer to creator failed");
        emit ProposalAccepted(_id, msg.sender, msg.value);
    }

    // 3. DELETE: cancelling proposal, have penalty of 10%
    function cancelProposal(uint256 _id) external {
        // validation
        require(_id > 0 && _id <= Proposal_count, "Proposal don't exist");
        WowoProposal storage proposal = Proposals[_id];

        require(msg.sender == proposal.creator, "Only creator can cancel");
        require(
            proposal.status == WowoProposalStatus.Pending,
            "Proposal already processed"
        );
        require(
            block.timestamp <= proposal.deadline,
            "Proposal already expired, use claimExpired"
        );

        proposal.status = WowoProposalStatus.Cancelled;

        // cut 10% penalty then transfer & update
        uint256 penalty = (proposal.collateral * 10) / 100;
        uint256 refundAmount = proposal.collateral - penalty;
        proposal.collateral = 0;

        (bool success, ) = proposal.creator.call{value: refundAmount}("");
        require(success, "Refund failed");

        emit ProposalCancelled(_id, refundAmount, penalty);
    }

    // 4. UPDATE/RECOVERY: claiming expired proposal, refunded 100%
    function claimExpiredProposal(uint256 _id) external {
        // validation
        require(_id > 0 && _id <= Proposal_count, "Proposal don't exist");
        WowoProposal storage proposal = Proposals[_id];

        require(msg.sender == proposal.creator, "Only creator can claim");
        require(
            proposal.status == WowoProposalStatus.Pending,
            "Proposal already processed"
        );
        require(
            block.timestamp > proposal.deadline,
            "Proposal is not expired yet"
        );

        // transfer & update data
        proposal.status = WowoProposalStatus.Expired;
        uint256 refundAmount = proposal.collateral;
        proposal.collateral = 0;
        (bool success, ) = proposal.creator.call{value: refundAmount}("");
        require(success, "Refund failed");
        emit ProposalClaimed(_id, refundAmount);
    }

    // 5. READ: reading proposal data by id
    function getProposalById(
        uint256 _id
    )
        external
        view
        returns (
            uint256 id,
            address creator,
            string memory title,
            string memory description,
            uint256 collateral,
            uint256 deadline,
            WowoProposalStatus status
        )
    {
        // validation
        require(_id > 0 && _id <= Proposal_count, "Proposal don't exist");

        // fetch
        WowoProposal storage proposal = Proposals[_id];

        // return
        return (
            proposal.id,
            proposal.creator,
            proposal.title,
            proposal.description,
            proposal.collateral,
            proposal.deadline,
            proposal.status
        );
    }
}
