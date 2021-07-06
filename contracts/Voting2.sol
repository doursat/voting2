// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Voting2 
 * @dev Voting2 system (by Rene Doursat)
 */
contract Voting2 is Ownable
{
    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint chosenProposalId;
    }
    
    struct Proposal {
        string description;
        uint voteCount;
    }
    
    enum WorkflowStatus {
        SystemReset,
        RegisteringVoters,
        ProposalsRegistrationStarted,
        ProposalsRegistrationEnded,
        VotingSessionStarted,
        VotingSessionEnded,
        VotesTallied,
        VotesReset
    }
    
    event SystemReset();
    event VoterRegistered(address voterAddress);
    event ProposalsRegistrationStarted();
    event ProposalsRegistrationEnded();
    event ProposalRegistered(uint proposalId);
    event VotingSessionStarted();
    event VotingSessionEnded();
    event Voted(address voter, uint proposalId);
    event VotesTallied();
    event VotesReset();
    event WorkflowStatusChange(WorkflowStatus previousStatus, WorkflowStatus newStatus);
    
    // Variables
    // ---------
    
    WorkflowStatus private _workflowStatus = WorkflowStatus.SystemReset;
	address[] private _addresses;
    mapping(address => Voter) private _voters;
    Proposal[] private _proposals;
    
    uint private _maxVoteCount;
    uint private _winningProposalId;
    
	// Admin's getters
	// ---------------
	
    function getWorkflowStatus() public view onlyOwnerOrVoter returns (WorkflowStatus) {
        return _workflowStatus;
    }
	
    function getWorkflowStatusString() public view onlyOwnerOrVoter returns (string memory) {
		if (_workflowStatus == WorkflowStatus.SystemReset) return "System Reset";
		if (_workflowStatus == WorkflowStatus.RegisteringVoters) return "Registering Voters";
		if (_workflowStatus == WorkflowStatus.ProposalsRegistrationStarted) return "Proposals Registration Started";
		if (_workflowStatus == WorkflowStatus.ProposalsRegistrationEnded) return "Proposals Registration Ended";
		if (_workflowStatus == WorkflowStatus.VotingSessionStarted) return "Voting Session Started";
		if (_workflowStatus == WorkflowStatus.VotingSessionEnded) return "Voting Session Ended";
		if (_workflowStatus == WorkflowStatus.VotesTallied) return "Votes Tallied";
		if (_workflowStatus == WorkflowStatus.VotesReset) return "Votes Reset";
		return "Unknown";
    }
	
	function getAddresses() public view onlyOwner returns (address[] memory) {
		return _addresses;
	}
	
	function getVoter(address addr) public view onlyOwner returns (bool, bool, uint) {
		Voter storage voter = _voters[addr];
		return (voter.isRegistered, voter.hasVoted, voter.chosenProposalId);
	}
	
	function getProposalCount() public view onlyOwnerOrVoter returns (uint) {
		return _proposals.length;
	}
	
	function getProposal(uint id) public view onlyOwnerOrVoter returns (string memory, uint) {
		Proposal storage proposal = _proposals[id-1];
		return (proposal.description, proposal.voteCount);
	}

    // Utilities
    // ---------

	function isAdmin(address addr) public view returns (bool) {
		return (addr == owner());
	}
	
	function isVoter(address addr) public view returns (bool) {
		return _voters[addr].isRegistered;
	}
	
    modifier onlyVoter() {
        require(_voters[msg.sender].isRegistered,
				"Only a registered voter can call this.");
        _;
    }
	
    modifier onlyOwnerOrVoter() {
        require(msg.sender == owner() || _voters[msg.sender].isRegistered,
				"Only the admin or a registered voter can call this.");
        _;
    }

    function _setWorkflowStatus(WorkflowStatus newStatus) private {
		WorkflowStatus previousStatus = _workflowStatus;
        _workflowStatus = newStatus;
        emit WorkflowStatusChange(previousStatus, newStatus);
    }

    function _reset(bool keepRegistered) private {
		for (uint i = 0; i < _addresses.length; i++) {
			Voter storage voter = _voters[_addresses[i]];
			
			if (!keepRegistered) voter.isRegistered = false;
			voter.hasVoted = false;
			voter.chosenProposalId = 0;
		}
		
		if (!keepRegistered) {
			delete _addresses;
			delete _proposals;
		} else {
			for (uint id = 1; id <= _proposals.length; id++) {
				_proposals[id-1].voteCount = 0;
			}		
		}
		
		_maxVoteCount = 0;
		_winningProposalId = 0;
	}
    
    // Reset System
    // ------------
    
    function resetSystem() public onlyOwner {
		// function always available: no requirement
		_reset(false);
		
        _setWorkflowStatus(WorkflowStatus.SystemReset);
        emit SystemReset();
    }
    
    // Voter registration phase
    // ------------------------
    
    function startRegisteringVoters() public onlyOwner {
		require(_workflowStatus == WorkflowStatus.SystemReset,
				"Cannot start registering voters if system not reset.");
				
        _setWorkflowStatus(WorkflowStatus.RegisteringVoters);
    }
    
    function registerVoter(address addr) public onlyOwner {
		require(_workflowStatus == WorkflowStatus.RegisteringVoters,
				"Not accepting voter registration at this stage.");
		
        Voter storage voter = _voters[addr];
        require(!voter.isRegistered,
                "Voter is already registered.");

		_addresses.push(addr);
        voter.isRegistered = true;
		
        emit VoterRegistered(addr);
    }
    
    // Proposals registration phase
    // ----------------------------
	
    function startProposalsRegistration() public onlyOwner {
		require(_workflowStatus == WorkflowStatus.RegisteringVoters,
				"Cannot start registering proposals if not currently registering voters.");
				
        _setWorkflowStatus(WorkflowStatus.ProposalsRegistrationStarted);
        emit ProposalsRegistrationStarted();
    }
	
    function registerProposal(string memory description) public onlyVoter {
		require(_workflowStatus == WorkflowStatus.ProposalsRegistrationStarted,
				"Not accepting proposal registration at this stage.");

		_proposals.push(Proposal(description, 0));
		
        emit ProposalRegistered(_proposals.length);
	}
	
    function endProposalsRegistration() public onlyOwner {
		require(_workflowStatus == WorkflowStatus.ProposalsRegistrationStarted,
				"Cannot end registering proposals if not currently started.");
				
        _setWorkflowStatus(WorkflowStatus.ProposalsRegistrationEnded);
        emit ProposalsRegistrationEnded();
    }
    
    // Voting session
	// --------------
    
    function startVotingSession() public onlyOwner {
		require(_workflowStatus == WorkflowStatus.ProposalsRegistrationEnded ||
				_workflowStatus == WorkflowStatus.VotesReset,
				"Cannot start voting session before proposals registration ended or votes were reset.");
		
        _setWorkflowStatus(WorkflowStatus.VotingSessionStarted);
        emit VotingSessionStarted();
    }
    
    function vote(uint proposalId) public onlyVoter {
		require(_workflowStatus == WorkflowStatus.VotingSessionStarted,
				"Not accepting votes at this stage.");
		
        Voter storage voter = _voters[msg.sender];
        require(!voter.hasVoted,
                "Voter has already voted.");
		require(proposalId > 0 && proposalId <= _proposals.length,
				"Invalid proposal id.");
        
        Proposal storage proposal = _proposals[proposalId-1];
        proposal.voteCount++;
        if (proposal.voteCount > _maxVoteCount) {
            _maxVoteCount = proposal.voteCount;
            _winningProposalId = proposalId;
        }
        
        voter.hasVoted = true;
        voter.chosenProposalId = proposalId;
		
        emit Voted(msg.sender, proposalId);
    }
	
    function endVotingSession() public onlyOwner {
		require(_workflowStatus == WorkflowStatus.VotingSessionStarted,
				"Cannot end voting session if not currently started.");
				
        _setWorkflowStatus(WorkflowStatus.VotingSessionEnded);
        emit VotingSessionEnded();
    }
    
    // Tally & reset votes
	// -------------------
    
    function tallyVotes() public onlyOwner {
		require(_workflowStatus == WorkflowStatus.VotingSessionEnded,
				"Cannot tally votes before voting session ended.");
        
        _setWorkflowStatus(WorkflowStatus.VotesTallied);
        emit VotesTallied();
    }
    
    function getChosenProposalId(address addr) public view onlyOwner returns (uint) {
		require(_workflowStatus == WorkflowStatus.VotesTallied,
				"Cannot access voted proposals before votes are tallied.");
		require(_voters[addr].isRegistered && _voters[addr].hasVoted,
				"Requested voter is not registered or has not voted yet.");
		
        return _voters[addr].chosenProposalId;
    }
    
    function getWinningProposalId() public view onlyOwnerOrVoter returns (uint) {
		require(_workflowStatus == WorkflowStatus.VotesTallied,
				"Cannot get winning proposal before votes are tallied.");
		require(_winningProposalId > 0,
				"No winning proposal was identified.");
		
        return _winningProposalId;
    }
    
    function resetVotes() public onlyOwner {
		require(_workflowStatus == WorkflowStatus.VotesTallied,
				"Cannot reset votes before they are tallied.");
		
		_reset(true);
		
        _setWorkflowStatus(WorkflowStatus.VotesReset);
        emit VotesReset();
    }
}