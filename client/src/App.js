import React, { Component } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Card from 'react-bootstrap/Card';
import ListGroup from 'react-bootstrap/ListGroup';
import Table from 'react-bootstrap/Table';
import Voting2Contract from "./contracts/Voting2.json";
import getWeb3 from "./getWeb3";
import "./App.css";

class App extends Component
{
	state = { web3: null, accounts: null, contract: null,
			  isAdmin: false, isVoter: false,
			  workflowStatus: 0, workflowStatusString: "",
			  voterRows: null, proposalRows: null, winningProposalRow: null };

	componentDidMount = async () => {
		try {
			const web3 = await getWeb3();
			const accounts = await web3.eth.getAccounts();
			const networkId = await web3.eth.net.getId();
			const deployedNetwork = Voting2Contract.networks[networkId];	  
			const contract = new web3.eth.Contract(Voting2Contract.abi,
												   deployedNetwork && deployedNetwork.address);

			this.setState({ web3, accounts, contract }, this.updateState);
		}
		catch (error) {
			alert('Failed to load web3, accounts, or contract. Check console.');
			console.error(error);
		}

		// listening to all events => update state and reload page
		const { contract } = this.state;
		contract.events.allEvents(function(err, event){ console.log(event); })
		.on('data', event => {
			this.updateState();
		})
		.on('error', function(error, receipt) {
			console.log(error, receipt);
		});
	};

    // Reset System
    // ------------

	resetSystem = async() => {
		const { accounts, contract } = this.state;
		await contract.methods.resetSystem().send({ from: accounts[0] });
		this.updateState();
	}
    
    // Voter registration phase
    // ------------------------

	startRegisteringVoters = async() => {
		const { accounts, contract } = this.state;
		await contract.methods.startRegisteringVoters().send({ from: accounts[0] });
		this.updateState();
	}

	registerVoter = async() => {
		const { accounts, contract } = this.state;
		const address = this.addressText.value;
		await contract.methods.registerVoter(address).send({ from: accounts[0] });
		this.updateState();
	}
    
    // Proposal registration phase
    // ---------------------------
	
    startProposalsRegistration = async() => {
		const { accounts, contract } = this.state;
		await contract.methods.startProposalsRegistration().send({ from: accounts[0] });
		this.updateState();
    }
	
    registerProposal = async() => {
		const { accounts, contract } = this.state;
		const description = this.descriptionText.value;
		await contract.methods.registerProposal(description).send({ from: accounts[0] });
		this.updateState();
    }
	
    endProposalsRegistration = async() => {
		const { accounts, contract } = this.state;
		await contract.methods.endProposalsRegistration().send({ from: accounts[0] });
		this.updateState();
    }
    
    // Voting session
    // --------------
	
    startVotingSession = async() => {
		const { accounts, contract } = this.state;
		await contract.methods.startVotingSession().send({ from: accounts[0] });
		this.updateState();
    }
	
    endVotingSession = async() => {
		const { accounts, contract } = this.state;
		await contract.methods.endVotingSession().send({ from: accounts[0] });
		this.updateState();
    }
    
    // Tally & reset votes
	// -------------------
	
    tallyVotes = async() => {
		const { accounts, contract } = this.state;
		await contract.methods.tallyVotes().send({ from: accounts[0] });
		this.updateState();
    }
	
    vote = async() => {
		const { accounts, contract } = this.state;
		const proposalId = this.voteText.value;
		await contract.methods.vote(proposalId).send({ from: accounts[0] });
		this.updateState();
    }
	
    resetVotes = async() => {
		const { accounts, contract } = this.state;
		await contract.methods.resetVotes().send({ from: accounts[0] });
		this.updateState();
    }
    
    // Update state & render
    // ---------------------

	updateState = async() => {
		const { accounts, contract } = this.state;
		
		const isAdmin = await contract.methods.isAdmin(accounts[0]).call();
		const isVoter = await contract.methods.isVoter(accounts[0]).call();
		
		const workflowStatus = await contract.methods.getWorkflowStatus().call();
		const workflowStatusString = await contract.methods.getWorkflowStatusString().call();
		
		// prepare voters' table to display
		var voterRows = [];
		if (isAdmin) {
			const addresses = await contract.methods.getAddresses().call();
			for (let i = 0; i < addresses.length; i++) {
				await contract.methods.getVoter(addresses[i]).call().then(function(res) {
					voterRows[i] = [addresses[i], res[1], res[2]];
				});
			}
		} else if (isVoter) {
			await contract.methods.getVoter(accounts[0]).call().then(function(res) {
				voterRows[0] = [accounts[0], res[1], res[2]];
			});
		}
			
		// prepare proposals table to display
		const n = await contract.methods.getProposalCount().call();
		var proposalRows = [], winningProposalRow = [];
		for (let id = 1; id <= n; id++) {
			await contract.methods.getProposal(id).call().then(function(res){
				proposalRows[id-1] = [id, res[0], res[1]];
			});
		}
		if (workflowStatus == 6) {
			const winId = await contract.methods.getWinningProposalId().call();
			await contract.methods.getProposal(winId).call().then(function(res){
				winningProposalRow = [winId, res[0], res[1]];
			});
		}
		
		this.setState({ isAdmin, isVoter,
						workflowStatus, workflowStatusString,
						voterRows, proposalRows, winningProposalRow });
	};
 
	render() {
		const { contract, isAdmin, isVoter,
				workflowStatus, workflowStatusString,
				voterRows, proposalRows, winningProposalRow } = this.state;
				
		if (!this.state.web3) {
			return <div>Loading web3, accounts, and contract...</div>;
		}
		return (
		  <div className="App">
			{ /* --- HEADERS -------------------------------------------------- */ }
			<br/>
			<div>
			  <h2 className="text-center">
				{ isAdmin && <>Admin Interface</> }
				{ !isAdmin && <>Voter Interface</> }
			  </h2>
			  <span className="text"><i><u>Workflow Status</u>:&nbsp;
				<mark>{ workflowStatusString }</mark></i></span>
			</div>
			<br/>
		    { /* --- REGISTERED VOTER(S) -------------------------------------- */ }
			<div style={{ display: 'flex', justifyContent: 'left' }}>
			  <Card className="text-start" style={{ width: '50rem' }}>
				{ isAdmin &&
				<Card.Header style={{ color: '#772EB4' }}><strong>Registered Voters</strong></Card.Header> }
				{ isVoter &&
				<Card.Header style={{ color: '#772EB4' }}><strong>Registered Voter</strong></Card.Header> }
				{ (!isAdmin && !isVoter) &&
				<Card.Header style={{ color: '#772EB4' }}><strong>Not Registered</strong></Card.Header> }
				<Card.Body>
				  <ListGroup variant="flush">
					<ListGroup.Item>
					  <Table striped bordered hover>
						<tbody>
						  <tr>
							<td><i>address</i></td>
							<td><i>voted</i></td>
							<td><i>chosen ID</i></td>
						  </tr>
						  { voterRows !== null && voterRows.map((vr) =>
						  <tr>
							<td>{ vr[0] }</td>
							<td><input disabled="true" type="checkbox" checked={ (vr[1] == true) }/></td>
							<td>{ vr[2] }</td>
						  </tr>) }
						</tbody>
					  </Table>
					</ListGroup.Item>
				  </ListGroup>
				</Card.Body>
			  </Card>
			</div>
		    { /* --- REGISTERED PROPOSALS (admin or voter) -------------------- */ }
			{ (isAdmin || isVoter) &&
			<div style={{ display: 'flex', justifyContent: 'left' }}>
			  <Card className="text-start" style={{ width: '50rem' }}>
				<Card.Header style={{ color: '#007ADE' }}><strong>Registered Proposals</strong></Card.Header>
				<Card.Body>
				  <ListGroup variant="flush">
					<ListGroup.Item>
					  <Table striped bordered hover>
						<tbody>
						  <tr>
							<td><i>ID</i></td>
							<td><i>description</i></td>
							<td><i>votes</i></td>
						  </tr>
						  { proposalRows !== null && proposalRows.map((pr) =>
						  <tr>
							<td>{ pr[0] }</td>
							<td>{ pr[1] }</td>
							<td>{ pr[2] }</td>
						  </tr>) }
						  { (workflowStatus == 6 && winningProposalRow !== null) && <>
						  <tr><td colspan="3">Winning proposal:</td></tr>
						  <tr>
							<td style={{ color: '#0000FF' }}>{ winningProposalRow[0] }</td>
							<td style={{ color: '#0000FF' }}>{ winningProposalRow[1] }</td>
							<td style={{ color: '#0000FF' }}>{ winningProposalRow[2] }</td>
						  </tr></> }
						</tbody>
					  </Table>
					</ListGroup.Item>
				  </ListGroup>
				</Card.Body>
			  </Card>
			</div> }
		    { /* --- REGISTRATION MANAGEMENT (admin only) --------------------- */ }
			{ isAdmin &&
			<div style={{ display: 'flex', justifyContent: 'left' }}>
			  <Card className="text-start" style={{ width: '50rem' }}>
				<Card.Header style={{ color: '#FF8800' }}><strong>Registration Management</strong></Card.Header>
				<Card.Body>
				  <Form.Group controlId="formAddress">
					<Form.Label>Voter's address:</Form.Label>
					<Form.Control type="text" id="addressText"
								  ref={ (input) => { this.addressText = input } }/>
				  </Form.Group>
				  <br/>
				  <Button disabled={ workflowStatus != 0 } onClick={ this.startRegisteringVoters } variant="secondary" > Start Registering Voters </Button>&nbsp;
				  <Button disabled={ workflowStatus != 1 } onClick={ this.registerVoter } variant="primary" > Register Voter </Button>
				  <br/><br/>
				  <Button disabled={ workflowStatus != 1 } onClick={ this.startProposalsRegistration } variant="secondary" > Start Proposals Registration </Button>&nbsp;
				  <Button disabled={ workflowStatus != 2 } onClick={ this.endProposalsRegistration } variant="secondary" > End Proposals Registration </Button>
				</Card.Body>
			  </Card>
			</div> }
		    { /* --- PROPOSAL REGISTRATION (voter only) ----------------------- */ }
			{ isVoter &&
			<div style={{ display: 'flex', justifyContent: 'left' }}>
			  <Card className="text-start" style={{ width: '50rem' }}>
				<Card.Header style={{ color: '#008800' }}><strong>Proposal Registration</strong></Card.Header>
				<Card.Body>
				  <Form.Group controlId="formDescription">
					<Form.Label>Proposal description:</Form.Label>
					<Form.Control type="text" id="descriptionText"
								  ref={ (input) => { this.descriptionText = input } }/>
				  </Form.Group>
				  <br/>
				  <Button disabled={ workflowStatus != 2 } onClick={ this.registerProposal } variant="primary" > Register Proposal </Button>
				</Card.Body>
			  </Card>
			</div> }
		    { /* --- VOTING MANAGEMENT (admin only) --------------------------- */ }
			{ isAdmin &&
			<div style={{ display: 'flex', justifyContent: 'left' }}>
			  <Card className="text-start" style={{ width: '50rem' }}>
				<Card.Header style={{ color: '#FF8800' }}><strong>Voting Management</strong></Card.Header>
				<Card.Body>
				  <Button disabled={ workflowStatus != 3 && workflowStatus != 7 } onClick={ this.startVotingSession } variant="secondary" > Start Voting Session </Button>&nbsp;
				  <Button disabled={ workflowStatus != 4 } onClick={ this.endVotingSession } variant="secondary" > End Voting Session </Button>
				  <br/><br/>
				  <Button disabled={ workflowStatus != 5 } onClick={ this.tallyVotes } variant="secondary" > Tally Votes </Button>&nbsp;
				  <Button disabled={ workflowStatus != 6 } onClick={ this.resetVotes } variant="warning" > Reset Votes </Button>&nbsp;
				  <Button onClick={ this.resetSystem } variant="danger" > Reset System </Button>
				</Card.Body>
			  </Card>
			</div> }
		    { /* --- VOTING (voter only) -------------------------------------- */ }
			{ isVoter &&
			<div style={{ display: 'flex', justifyContent: 'left' }}>
			  <Card className="text-start" style={{ width: '50rem' }}>
				<Card.Header style={{ color: '#008800' }}><strong>Voting</strong></Card.Header>
				<Card.Body>
				  <Form.Group controlId="formVote">
					<Form.Label>Chosen Proposal ID:</Form.Label>
					<Form.Control type="text" id="voteText"
								  ref={ (input) => { this.voteText = input } }/>
				  </Form.Group>
				  <br/>
				  <Button disabled={ workflowStatus != 4 } onClick={ this.vote } variant="secondary" > Vote </Button>
				</Card.Body>
			  </Card>
			</div> }
		  </div>
		);
	}
}

export default App;
