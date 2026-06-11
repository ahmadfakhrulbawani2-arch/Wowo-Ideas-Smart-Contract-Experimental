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
        Pending, // 0
        Accepted, // 1
        Expired, // 2
        Cancelled // 3
    }

    // pentingnya belajar DSA ya adick-adick
    // === Proposal data structures ===
    struct WowoProposal {
        uint256 id;
        address payable creator;
        address buyer;
        WowoProposalStatus status; // Dipindah ke sini agar nempel hemat slot dengan buyer
        uint256 collateral;
        uint256 deadline;
        string title;
        string description;
        string detail;
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
    uint256 public penaltiesAccumulator; // storring total penalties
    mapping(uint256 => WowoProposal) public Proposals; // storing proposal data

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

    // ===== ADMIN SPACE =====
    event WithdrawPenalties(address owner, uint256 refund);

    // ===== ADMIN SPACE =====

    // === Smart contract detailed event list

    // 1. CREATE: create a proposal
    function createProposal(
        string calldata _title,
        string calldata _description,
        string calldata _detail
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
            buyer: address(0), // this means 0x000000000000000000 or null address
            title: _title,
            description: _description,
            detail: _detail,
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
        proposal.buyer = msg.sender;
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

        penaltiesAccumulator += penalty;

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
            address buyer,
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
            proposal.buyer,
            proposal.title,
            proposal.description,
            proposal.collateral,
            proposal.deadline,
            proposal.status
        );
    }

    // 6. READ: read how many proposals in this contract
    function getProposalCount() external view returns (uint256 cnt) {
        return Proposal_count;
    }

    // 7. READ: read proposal detail
    // 7. READ: read proposal detail
    function getProposalDetail(
        uint256 _id
    ) external view returns (string memory detail) {
        require(_id > 0 && _id <= Proposal_count, "Proposal don't exist");
        WowoProposal storage proposal = Proposals[_id];

        // Amankan gerbang pertama
        require(
            msg.sender == proposal.creator || msg.sender == proposal.buyer,
            "Can't access proposal detail"
        );

        // SOLUSI: Kita balik logikanya menjadi POSITIF biar tidak terjebak bug casing string.
        // "Jika pengirimnya ADALAH creator, langsung loloskan tanpa masuk ke require status"
        if (msg.sender == proposal.creator) {
            return proposal.detail;
        }

        // Jalur di bawah ini HANYA akan dieksekusi oleh si Buyer resmi
        require(
            proposal.status == WowoProposalStatus.Accepted,
            "Proposal not accepted yet"
        );

        return proposal.detail;
    }

    // ===== ADMIN SPACE =====
    // withdraw penalties
    function withdrawPenalties() external {
        require(msg.sender == Owner, "Only owner can access");

        uint256 amountToWithdraw = penaltiesAccumulator; // Baca storage 1x (Hemat Gas)
        require(amountToWithdraw > 0, "No funds to withdraw");

        penaltiesAccumulator = 0; // EFFECTS: Reset dulu sebelum transfer (100% AMAN)

        // INTERACTIONS: Baru kirim duitnya keluar
        (bool success, ) = payable(Owner).call{value: amountToWithdraw}("");
        require(success, "Withdraw failed");

        emit WithdrawPenalties(msg.sender, amountToWithdraw);
    }
    // ===== ADMIN SPACE =====
}
