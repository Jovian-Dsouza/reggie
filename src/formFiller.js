const { Builder, By, until } = require('selenium-webdriver');
const { OpenAI } = require('openai'); // Uses OpenAI SDK interface
const  dotnev = require('dotenv');
dotnev.config();

// Configure Groq client with OpenAI SDK
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY, // Store API key in environment variables
  baseURL: 'https://api.groq.com/openai/v1', // Groq API endpoint
});

// The main function to fill the form using a single LLM query
async function fillFormWithLLM(link, additionalContext = '') {
  const driver = await new Builder().forBrowser('chrome').build();
  
  try {
    await driver.get(link);

    // Wait for the "Request to Join" button to appear and click it
    const requestToJoinButton = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(@class, 'luma-button') and contains(@class, 'primary')]")),
      10000 // Wait up to 10 seconds
    );
    await requestToJoinButton.click();

    await driver.wait(until.elementLocated(By.css('form.registration-form-container')), 10000);
    const form = await driver.findElement(By.css('form.registration-form-container'));
    
    // Get event context
    const eventContext = await getEventContext(driver);
    
    // Collect all form fields and their metadata
    const formFields = await collectFormFields(form);
    
    // Generate all field values with a single LLM query
    const fieldValues = await generateAllFieldValues(formFields, eventContext, additionalContext);
    
    // Fill the form with generated values
    await fillForm(form, formFields, fieldValues);
    
    // Optional: Wait for manual review before submitting
    console.log('Form filled. Press Ctrl+C to quit or wait 30 seconds for auto-submission');
    await driver.sleep(30000);
    
    // Uncomment to submit the form automatically
    // const submitButton = await form.findElement(By.css('button[type="submit"]'));
    // await submitButton.click();

    // Wait for the "Request to Join" button to appear and click it
    // const requestToJoinButton2 = await driver.wait(
    //   until.elementLocated(By.xpath("//button[contains(@class, 'luma-button') and contains(@class, 'primary')]")),
    //   10000 // Wait up to 10 seconds
    // );
    // await requestToJoinButton2.click();
    
  } catch (error) {
    console.error('Error in LLM form filling:', error);
  } finally {
    await driver.quit();
  }
}

// Collect form fields and their metadata
async function collectFormFields(form) {
  const formFields = [];
  const labelElements = await form.findElements(By.tagName('label'));
  
  for (let labelElement of labelElements) {
    const labelText = await labelElement.getText();
    const labelFor = await labelElement.getAttribute('for');
    
    let associatedElement = null;
    if (labelFor) {
      try {
        associatedElement = await form.findElement(By.id(labelFor));
      } catch (error) {
        console.log(`Could not find element with ID ${labelFor}`);
        continue;
      }
    }
    
    if (associatedElement) {
      const elementType = await associatedElement.getTagName();
      const elementName = await associatedElement.getAttribute('name') || labelFor;
      const required = (await associatedElement.getAttribute('required')) === 'true' || labelText.includes('*');
      let options = [];
      
      // For select elements, collect options
      if (elementType === 'select') {
        const optionElements = await associatedElement.findElements(By.tagName('option'));
        for (let optionElement of optionElements) {
          const optionText = await optionElement.getText();
          if (optionText && !optionText.includes('Select') && !optionText.includes('Choose')) {
            options.push(optionText);
          }
        }
      }
      
      formFields.push({
        labelText,
        elementType,
        elementName,
        required,
        options,
        element: associatedElement
      });
    }
  }
  
  return formFields;
}

// Function to get event context
async function getEventContext(driver) {
  try {
    // Extract event title
    const eventTitle = await driver.findElement(By.css('h1')).getText();
    
    // Extract event description if available
    let eventDescription = '';
    try {
      eventDescription = await driver.findElement(By.css('.event-description')).getText();
    } catch (error) {
      console.log('Could not extract event description');
      // Try alternative selectors
      try {
        eventDescription = await driver.findElement(By.css('[class*="description"]')).getText();
      } catch (error) {
        console.log('Could not extract event description from alternative selectors');
      }
    }
    
    // Extract event date/time
    let eventDateTime = '';
    try {
      eventDateTime = await driver.findElement(By.css('.event-datetime')).getText();
    } catch (error) {
      console.log('Could not extract event date/time');
      // Try alternative selectors
      try {
        eventDateTime = await driver.findElement(By.css('[class*="date"]')).getText();
      } catch (error) {
        console.log('Could not extract event date/time from alternative selectors');
      }
    }
    
    // Extract location if available
    let eventLocation = '';
    try {
      eventLocation = await driver.findElement(By.css('[class*="location"]')).getText();
    } catch (error) {
      console.log('Could not extract event location');
    }
    
    return {
      eventTitle,
      eventDescription,
      eventDateTime,
      eventLocation
    };
  } catch (error) {
    console.error('Error extracting event context:', error);
    return { eventTitle: 'Event' }; // Fallback
  }
}

// Generate all field values with a single LLM query
async function generateAllFieldValues(formFields, eventContext, additionalContext) {
  // Create a structured description of all form fields
  const fieldDescriptions = formFields.map(field => {
    const description = {
      fieldName: field.labelText,
      fieldType: field.elementType,
      required: field.required
    };
    
    // Include options for select elements
    if (field.elementType === 'select' && field.options.length > 0) {
      description.options = field.options;
    }
    
    return description;
  });
  
  // Build the complete prompt with all context
  const prompt = createFormFillingPrompt(fieldDescriptions, eventContext, additionalContext);
  
  try {
    console.log('Sending request to LLM API...');
    
    // Make API call to Groq using OpenAI SDK interface
    const response = await groq.chat.completions.create({
      model: 'llama3-8b-8192', // You can also use 'mixtral-8x7b-32768' or other Groq models
      messages: [
        { 
          role: 'system', 
          content: 'You are a helpful assistant that generates form data in valid JSON format. Your responses must be valid JSON objects that can be parsed with JSON.parse().'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" } // Ensure JSON response format
    });
    
    // Extract and parse the JSON response
    const jsonResponse = response.choices[0].message.content.trim();
    console.log('Received response from LLM API', JSON.stringify(jsonResponse, null, 2));
    
    try {
      return JSON.parse(jsonResponse);
    } catch (parseError) {
      console.error('Error parsing LLM response as JSON:', parseError);
      console.log('Raw response:', jsonResponse);
      return {}; // Return empty object on parse error
    }
  } catch (error) {
    console.error('Error calling Groq API:', error);
    return {}; // Return empty object on API error
  }
}

// Create a comprehensive prompt for form filling
function createFormFillingPrompt(fieldDescriptions, eventContext, additionalContext) {
  // Format event context
  let contextDescription = '';
  if (eventContext.eventTitle) {
    contextDescription += `Event Title: ${eventContext.eventTitle}\n`;
  }
  if (eventContext.eventDescription) {
    contextDescription += `Event Description: ${eventContext.eventDescription}\n`;
  }
  if (eventContext.eventDateTime) {
    contextDescription += `Event Date/Time: ${eventContext.eventDateTime}\n`;
  }
  if (eventContext.eventLocation) {
    contextDescription += `Event Location: ${eventContext.eventLocation}\n`;
  }
  
  // Add user-provided additional context
  if (additionalContext) {
    contextDescription += `\nAdditional Context: ${additionalContext}\n`;
  }
  
  // Build the prompt
  return `
Please generate realistic form data for an event registration form.

EVENT INFORMATION:
${contextDescription}

FORM FIELDS:
${JSON.stringify(fieldDescriptions, null, 2)}

Requirements:
1. Generate appropriate values for each field based on its type and name
2. For select fields, choose one of the provided options
3. For required fields (marked with "required": true), ensure a value is provided
4. Make sure values are realistic and contextually appropriate
5. For text inputs that ask for names, generate realistic full names
6. For email fields, generate appropriate email addresses
7. For text areas, generate coherent paragraphs of appropriate length
8. For date fields, select appropriate dates considering the event information

Respond with ONLY a JSON object with the field names as keys and the generated values as values.
Example format:
{
  "Name *": "John Smith",
  "Email *": "john.smith@example.com",
  "Why are you interested in attending this event?": "As a technology professional, I'm excited to learn about the latest developments and network with peers."
}
`;
}

// Fill the form with generated values
async function fillForm(form, formFields, fieldValues) {
  for (const field of formFields) {
    const { labelText, element, elementType } = field;
    
    // Get the generated value
    const value = fieldValues[labelText];
    
    if (!value) {
      console.log(`No value generated for field: ${labelText}`);
      continue;
    }
    
    try {
      // Fill the form field based on its type
      if (elementType === 'input' || elementType === 'textarea') {
        await element.clear();
        await element.sendKeys(value);
      } else if (elementType === 'select') {
        // Try to find and click the option that best matches the generated value
        const options = await element.findElements(By.tagName('option'));
        let bestMatch = null;
        let highestSimilarity = 0;
        
        for (let option of options) {
          const optionText = await option.getText();
          if (!optionText || optionText.includes('Select') || optionText.includes('Choose')) continue;
          
          const similarity = calculateSimilarity(value, optionText);
          if (similarity > highestSimilarity) {
            highestSimilarity = similarity;
            bestMatch = option;
          }
        }
        
        if (bestMatch) {
          await bestMatch.click();
        } else if (options.length > 1) {
          // If no good match, select the first non-placeholder option
          for (let option of options) {
            const optionText = await option.getText();
            if (optionText && !optionText.includes('Select') && !optionText.includes('Choose')) {
              await option.click();
              break;
            }
          }
        }
      }
      
      console.log(`Filled ${labelText} with: ${value}`);
    } catch (error) {
      console.error(`Error filling field ${labelText}:`, error);
    }
  }
}

// Helper function to calculate string similarity for select options
function calculateSimilarity(str1, str2) {
  const s1 = String(str1).toLowerCase();
  const s2 = String(str2).toLowerCase();
  
  // Check if one string contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.8; // High similarity for substring matches
  }
  
  // Count matching words
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  let matches = 0;
  
  for (const word1 of words1) {
    if (word1.length <= 2) continue; // Skip short words
    for (const word2 of words2) {
      if (word2.length <= 2) continue;
      if (word1 === word2 || (word1.length > 4 && word2.includes(word1)) || (word2.length > 4 && word1.includes(word2))) {
        matches++;
        break;
      }
    }
  }
  
  return matches / Math.max(words1.length, words2.length);
}

module.exports = { fillFormWithLLM }
