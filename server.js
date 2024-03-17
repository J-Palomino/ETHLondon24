const express = require('express');
const bodyParser = require('body-parser');
const { Telnyx } = require('telnyx');

const app = express();
const port = 3000;

// Parse JSON bodies
app.use(bodyParser.json());

// Configure Telnyx API client
const telnyxApiKey = process.env.PVT_KEY;
const publicKey = process.env.PUB_KEY;
const telnyx = Telnyx(telnyxApiKey);
const baseURL = "http://localhost:3000"
const baseUR2 = 'https://6035-212-82-84-238.ngrok-free.app'

// Object to store user responses
const userResponses = {};

// Endpoint to handle incoming calls
app.post('/webhooks', async (req, res) => {
    try {
        event = telnyx.webhooks.constructEvent(
          // webhook data needs to be passed raw for verification
          JSON.stringify(req.body, null, 2),
          req.header('telnyx-signature-ed25519'),
          req.header('telnyx-timestamp'),
          publicKey
        );
      } catch (e) {
        // If `constructEvent` throws an error, respond with the message and return.
        console.log('Error', e.message);
    
        return res.status(400).send('Webhook Error:' + e.message);
      }


  const { from, to } = req.body.data.payload;
    console.log("to", to)
    console.log("from", from)
  try {
    // Play welcome message
    await telnyx.calls.create({
      to: from,
      from: to,
      answer_url: `${baseURL}/webhooks/welcome`,
      call_control_id: event.data.payload.call_control_id
    });
    res.sendStatus(200);
  } catch (error) {
    console.error('Error answering call:', error);
    res.sendStatus(500);
  }
});

all_control_id: event.data.payload.call_control_id

// Endpoint to handle call answered event
app.post('/webhooks/welcome', async (req, res) => {
  const response = new telnyx.CallResponse();
const callId = req.body.data.payload.call_control_id
  // Ask if the user wants to create a new wallet
  response.gatherSpeak({
    action: `${baseURL}/webhooks/create-wallet`,
    timeout: 10,
    finishOnKey: '#',
    language: 'en-US',
    command_id: "891510ac-f3e4-11e8-af5b-de00688a4902",
     
  }, 'Would you like to create a new wallet?');

  res.send(response);
});

// Endpoint to handle user's choice to create a new wallet
app.post('/webhooks/create-wallet', async (req, res) => {
  const response = new telnyx.CallResponse();
  const { from } = req.body.data.payload;
  const userSpeech = req.body.data.payload.speech_recognition ? req.body.data.payload.speech_recognition.text : '';

  if (userSpeech.toLowerCase().includes('yes')) {
    // User wants to create a new wallet
    userResponses[from] = { createWallet: true };

    // Ask which blockchain they would like the wallet on
    response.gatherSpeak({
      action: `${baseURL}/webhooks/blockchain-choice`,
      timeout: 10,
      finishOnKey: '#',
      language: 'en-US'
    }, 'Which blockchain would you like the wallet on? Say Bitcoin or Ethereum.');

  } else {
    // User does not want to create a wallet
    userResponses[from] = { createWallet: false };
    response.hangup();
  }

  res.send(response);
});

// Endpoint to handle user's choice of blockchain
app.post('/webhooks/blockchain-choice', async (req, res) => {
  const response = new telnyx.CallResponse();
  const { from } = req.body.data.payload;
  const userSpeech = req.body.data.payload.speech_recognition ? req.body.data.payload.speech_recognition.text : '';

  // Store user's choice of blockchain
  if (userSpeech.toLowerCase().includes('bitcoin')) {
    userResponses[from].blockchain = 'Bitcoin';
  } else if (userSpeech.toLowerCase().includes('ethereum')) {
    userResponses[from].blockchain = 'Ethereum';
  }

  // Thank the user and end the call
  response.say("Thank you. Your wallet will be created on the chosen blockchain.");
  response.hangup();

  res.send(response);
});

// Main function to start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
