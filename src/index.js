const { fillFormWithLLM } = require('./formFiller')

// Example usage
const link = 'https://lu.ma/stratvd6';
const additionalContext = `The person registering for web3 events
Name: Jovian Dsouza
Email: dsouzajovian123@gmail.com
Company: CoinDCX / Okto
Title: Software developer for blockchain
`;
fillFormWithLLM(link, additionalContext);