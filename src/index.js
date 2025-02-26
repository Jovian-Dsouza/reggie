const { fillFormWithLLM } = require('./formFiller');
const events = require('../data/denver.json');

const additionalContext = `The person registering for web3 events
Name: Jovian Dsouza
Email: dsouzajovian123@gmail.com
Company: CoinDCX / Okto
Title: Software developer for blockchain`;

async function fillForms() {
  console.log('Starting form filling process...');
  console.log(`Total events to process: ${events.length}`);

  for (const event of events) {
    console.log(`Processing event: ${event.name}`);
    console.log(`Event URL: ${event.luma_link}`);
    try {
      await fillFormWithLLM(event.luma_link, additionalContext);
      console.log(`Successfully filled form for ${event.name}`);
    } catch (error) {
      console.error(`Failed to fill form for ${event.name}: ${error.message}`);
    }
    console.log(`Finished processing event: ${event.name}`);
  }

  console.log('Form filling process completed.');
}

fillForms();