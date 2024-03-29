'use strict';

const Telnyx = require('telnyx');
const Express = require('express');
const bodyParser = require('body-parser');
const app = Express();

/**
 * You'll need to make sure this is externally accessible with ngrok
 * TELNYX_API_KEY=KEYXXX TELNYX_PUBLIC_KEY=ZZZXXX node express.js
 */

const apiKey = process.env.TELNYX_API_KEY;
const publicKey = process.env.TELNYX_PUBLIC_KEY;

const telnyx = Telnyx(apiKey);

async function getEthereumPrice() {
  try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      if (!response.ok) {
          throw new Error('Failed to fetch Ethereum price');
      }
      const data = await response.json();
      const ethereumPrice = data.ethereum.usd;
      return ethereumPrice;
  } catch (error) {
      console.error('Error fetching Ethereum price:', error.message);
      throw error;
  }
}

app.post('/webhooks', bodyParser.json(), function(req, res) {
  var event;

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

  /**
   * Messaging:
   */
  if (event.data.event_type === 'message.finalized') {
    console.log('Message Finalized.Status: ' + event.data.payload.call_control_id);
  }

  /**
   * Inbound Call Control:
   * first we listen for an initiation event and then answer the call
   */
  if (event.data.event_type === 'call.initiated') {
    console.log('Call Initiated. Answering call with call control id: ' + event.data.payload.call_control_id);

    const call = new telnyx.Call({call_control_id: event.data.payload.call_control_id});

    call.answer();
  }
  if (event.data.event_type === 'call.answered') {
    console.log('Call Answered. Gather audio with the call control id: ' + event.data.payload.call_control_id);

    const call = new telnyx.Call({call_control_id: event.data.payload.call_control_id});
    
    getEthereumPrice()
    .then(ethereumPrice => {
        console.log('Current Ethereum price:', ethereumPrice);
        call.speak({
          payload: `Hello and welcome to BlockTalk, The current price of ethereum is: ${ethereumPrice}`,
          payload_type: "text",
          service_level: "basic",
          stop: "current",
          voice: "female",
          language: "en-US",
          client_state: "aGF2ZSBhIG5pY2UgZGF5ID1d",
          command_id: "891510ac-f3e4-11e8-af5b-de00688a4901"
        })
    })
    .catch(error => {
        console.error('Failed to get Ethereum price:', error);
    });
    // call.gather_using_audio({audio_url: 'https://file-examples-com.github.io/uploads/2017/11/file_example_MP3_700KB.mp3'});
    // const utterThis = new SpeechSynthesisUtterance("you did it you crazy bastard");

  }
  if (event.data.event_type === 'call.gather.ended') {
    console.log('Call Gathered with Audio. Hanging up call control id: ' + event.data.payload.call_control_id);

    const call = new telnyx.Call({call_control_id: event.data.payload.call_control_id});

    call.hangup();
  }
  if (event.data.event_type === 'call.hangup') {
    console.log('Call Hangup. call control id: ' + event.data.payload.call_control_id);
  }

  // Event was 'constructed', so we can respond with a 200 OK
  res.status(200).send(`Signed Webhook Received: ${event.data.event_type}, ${event.data.id}`);
});


app.listen(3000, function() {
  console.log('Example app listening on port 3000!');
});
