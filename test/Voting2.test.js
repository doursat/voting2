const { expectEvent, expectRevert } = require("@openzeppelin/test-helpers");
const { expect } = require("chai");
const Voting2 = artifacts.require("Voting2");

contract("Voting2", function(accounts) {
	const [ admin, account1, account2, account3, account4,
				  account5, account6, account7, account8, account9 ] = accounts;
	
	const WorkflowStatus = {
		SystemReset: 0,
		RegisteringVoters: 1,
		ProposalsRegistrationStarted: 2,
		ProposalsRegistrationEnded: 3,
		VotingSessionStarted: 4,
		VotingSessionEnded: 5,
		VotesTallied: 6,
		VotesReset: 7
	};
	
	var voting2 = null;
	
	before(async function() {
		voting2 = await Voting2.new({ from: admin });
	});

	// Access control
	// --------------
	
	describe('Access control', () => {
		it('contract owner must be admin', async () => {
			assert.equal(await voting2.owner(), admin);
		});

		it('account9 cannot call onlyOwner getAddresses()...', async () => {
			await expectRevert(voting2.getAddresses({ from: account9 }),
				"Ownable: caller is not the owner");
		});

		it('admin can call onlyOwner getAddresses() and must receive empty array []', async () => {
			const addresses = await voting2.getAddresses({ from: admin });
			assert.equal(addresses.length, 0);
		});

		it('account9 cannot yet call onlyOwnerOrVoter getProposalCount()...', async () => {
			await expectRevert(voting2.getProposalCount({ from: account9 }),
				"Only the admin or a registered voter can call this.");
		});
	});

	// Reset system phase
	// ------------------

	describe('Reset system phase', () => {
		it('resetSystem() must emit SystemReset event', async () => {
			const receipt = await voting2.resetSystem({ from: admin });
			expectEvent(receipt, "SystemReset");
		});
		
		it('after resetSystem(), status must be SystemReset', async () => {
			assert.equal(await voting2.getWorkflowStatus(), WorkflowStatus.SystemReset);
		});
	});

	// Voter registration phase
	// ------------------------

	describe('Voter registration phase', () => {
		it('after startRegisteringVoters(), status must be RegisteringVoters', async () => {
			await voting2.startRegisteringVoters({ from: admin });
			assert.equal(await voting2.getWorkflowStatus(), WorkflowStatus.RegisteringVoters);
		});

		it('before registering, getVoter(account9) must return (false, false, 0)', async () => {
			var res = await voting2.getVoter(account9, { from: admin });
			assert.equal(res[0], false); // isRegistered
			assert.equal(res[1], false); // hasVoted
			assert.equal(res[2], 0); // chosenProposalId
		});

		it('calling registerVoter(account9) from admin must emit VoterRegistered event', async () => {
			const receipt = await voting2.registerVoter(account9, { from: admin });
			expectEvent(receipt, "VoterRegistered");
		});

		it('after that, getVoter(account9) must receive (true, false, 0)', async () => {
			var res = await voting2.getVoter(account9, { from: admin });
			assert.equal(res[0], true); // isRegistered
			assert.equal(res[1], false); // hasVoted
			assert.equal(res[2], 0); // chosenProposalId
		});

		it('account9 can now call getProposalCount() and receive 0', async () => {
			const propCount = await voting2.getProposalCount({ from: account9 });
			assert.equal(propCount, 0);
		});

		it('calling again registerVoter(account9) from admin must fail...', async () => {
			await expectRevert(voting2.registerVoter(account9, { from: admin }),
				"Voter is already registered.");
		});

		it('calling registerVoter(account8) from admin must emit VoterRegistered event', async () => {
			const receipt = await voting2.registerVoter(account8, { from: admin });
			expectEvent(receipt, "VoterRegistered");
		});

		it('calling registerVoter(account7) from admin must emit VoterRegistered event', async () => {
			const receipt = await voting2.registerVoter(account7, { from: admin });
			expectEvent(receipt, "VoterRegistered");
		});

		it('calling registerVoter(account6) from admin must emit VoterRegistered event', async () => {
			const receipt = await voting2.registerVoter(account6, { from: admin });
			expectEvent(receipt, "VoterRegistered");
		});

		it('calling registerVoter(account5) from account5 itself must fail...', async () => {
			await expectRevert(voting2.registerVoter(account5, { from: account5 }),
				"Ownable: caller is not the owner");
		});

		it('calling registerVoter(account5) from admin must emit VoterRegistered event', async () => {
			const receipt = await voting2.registerVoter(account5, { from: admin });
			expectEvent(receipt, "VoterRegistered");
		});
	});

	// Proposals registration phase
	// ----------------------------

	describe('Proposals registration phase', () => {
		it('calling startVotingSession too soon must fail...', async () => {
			await expectRevert(voting2.startVotingSession({ from: admin }),
				"Cannot start voting session before proposals registration ended or votes were reset.");
		});
		
		it('after startProposalsRegistration(), status must be ProposalsRegistrationStarted', async () => {
			await voting2.startProposalsRegistration({ from: admin });
			assert.equal(await voting2.getWorkflowStatus(), WorkflowStatus.ProposalsRegistrationStarted);
		});

		it('calling registerProposal("Hello world #9!") must emit ProposalRegistered event', async () => {
			const receipt = await voting2.registerProposal("Hello world #9!", { from: account9 });
			expectEvent(receipt, "ProposalRegistered");
		});

		it('calling getProposal(1) must now return ("Hello world #9!", 0<votes>)', async () => {
			var res = await voting2.getProposal(1, { from: account9 });
			assert.equal(res[0], "Hello world #9!"); // proposal.description
			assert.equal(res[1], 0); // proposal.voteCount
		});

		it('calling registerProposal("Hello world #8!") must emit ProposalRegistered event', async () => {
			const receipt = await voting2.registerProposal("Hello world #8!", { from: account8 });
			expectEvent(receipt, "ProposalRegistered");
		});

		it('calling registerProposal("Hello world #7!") must emit ProposalRegistered event', async () => {
			const receipt = await voting2.registerProposal("Hello world #7!", { from: account7 });
			expectEvent(receipt, "ProposalRegistered");
		});

		it('calling endProposalsRegistration must emit ProposalsRegistrationEnded event', async () => {
			const receipt = await voting2.endProposalsRegistration({ from: admin });
			expectEvent(receipt, "ProposalsRegistrationEnded");
		});
	});

	// Voting session
	// --------------

	describe('Voting session', () => {
		it('calling startVotingSession must now work and emit VotingSessionStarted event', async () => {
			const receipt = await voting2.startVotingSession({ from: admin });
			expectEvent(receipt, "VotingSessionStarted");
		});
		
		it('calling registerProposal("Hello world #6!") too late shoud fail', async () => {
			await expectRevert(voting2.registerProposal("Hello world #6!", { from: account6 }),
				"Not accepting proposal registration at this stage.");
		});
		
		it('admin should not be able to vote', async () => {
			await expectRevert(voting2.vote(account9, { from: admin }),
				"Only a registered voter can call this.");
		});

		it('account9 calling vote(3) must emit Voted event', async () => {
			const receipt = await voting2.vote(3, { from: account9 });
			expectEvent(receipt, "Voted");
		});

		it('account8 calling vote(3) must emit Voted event', async () => {
			const receipt = await voting2.vote(3, { from: account8 });
			expectEvent(receipt, "Voted");
		});

		it('account8 trying to vote again must fail...', async () => {
			await expectRevert(voting2.vote(2, { from: account8 }),
				"Voter has already voted.");
		});

		it('account7 trying to vote out of bounds must fail...', async () => {
			await expectRevert(voting2.vote(10, { from: account7 }),
				"Invalid proposal id.");
		});

		it('account7 calling vote(1) must emit Voted event', async () => {
			const receipt = await voting2.vote(1, { from: account7 });
			expectEvent(receipt, "Voted");
		});

		it('unregistered account4 trying to vote must fail...', async () => {
			await expectRevert(voting2.vote(1, { from: account4 }),
				"Only a registered voter can call this.");
		});

		it('calling getWinningProposalId to soon must fail...', async () => {
			await expectRevert(voting2.getWinningProposalId({ from: admin }),
				"Cannot get winning proposal before votes are tallied.");
		});

		it('calling getProposal(3) must now return ("Hello world #7!", 2<votes>)', async () => {
			var res = await voting2.getProposal(3, { from: admin });
			assert.equal(res[0], "Hello world #7!"); // proposal.description
			assert.equal(res[1], 2); // proposal.voteCount
		});

		it('calling endVotingSession() must emit VotingSessionEnded event', async () => {
			const receipt = await voting2.endVotingSession({ from: admin });
			expectEvent(receipt, "VotingSessionEnded");
		});
	});

	// Tally & reset votes
	// -------------------

	describe('Tally & reset votes', () => {
	  it('calling tallyVotes must emit VotesTallied event', async () => {
			const receipt = await voting2.tallyVotes({ from: admin });
			expectEvent(receipt, "VotesTallied");
		});
		
	  it('calling getChosenProposalId(account9) must return 3', async () => {
			assert.equal(await voting2.getChosenProposalId(account9, { from: admin }), 3);
		});
		
	  it('calling getChosenProposalId(account8) must return 3', async () => {
			assert.equal(await voting2.getChosenProposalId(account8, { from: admin }), 3);
		});
		
	  it('calling getChosenProposalId(account7) must return 1', async () => {
			assert.equal(await voting2.getChosenProposalId(account7, { from: admin }), 1);
		});

		it('calling getChosenProposalId(account6) must fail...', async () => {
			await expectRevert(voting2.getChosenProposalId(account6, { from: admin }),
				"Requested voter is not registered or has not voted yet.");
		});
		
	  it('calling getWinningProposalId() must return 3', async () => {
			assert.equal(await voting2.getWinningProposalId({ from: admin }), 3);
		});
		
		it('after resetVotes(), status must be VotesReset', async () => {
			await voting2.resetVotes({ from: admin });
			assert.equal(await voting2.getWorkflowStatus(), WorkflowStatus.VotesReset);
		});
	});
});