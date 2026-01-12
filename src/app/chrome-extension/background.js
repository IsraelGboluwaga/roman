const ANTHROPIC_API_KEY = ''; // Store in chrome.storage.sync instead

// Generate answers using Claude
async function generateAnswers(fields, resumeText) {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: `You are helping fill out a job application form. Here is the candidate's resume:

<resume>
${resumeText}
</resume>

Here are the form fields that need to be filled:

<form_fields>
${JSON.stringify(fields, null, 2)}
</form_fields>

For each field, provide an appropriate answer based on the resume. Return your response as a JSON array with this structure:

[
  {
    "xpath": "field xpath",
    "type": "field type",
    "label": "field label",
    "answer": "your answer here"
  }
]

Guidelines:
- For text fields: Provide concise, relevant answers from the resume
- For dropdowns: Choose the most appropriate option from the available choices
- For checkboxes: Return true/false based on resume info
- For required fields without resume info: Use reasonable defaults or indicate "N/A"
- Keep answers professional and truthful to the resume
- For "why do you want to work here" type questions, craft a thoughtful 2-3 sentence response

Return ONLY the JSON array, no other text.`
        }]
      })
    });
    
    const data = await response.json();
    const answerText = data.content[0].text;
    
    // Extract JSON from response (Claude might wrap it in markdown)
    const jsonMatch = answerText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return JSON.parse(answerText);
    
  } catch (error) {
    console.error('Error generating answers:', error);
    throw error;
  }
}

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fillForm') {
    handleFormFill(sender.tab.id, request.resume)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keep channel open for async
  }
});

async function handleFormFill(tabId, resume) {
  try {
    // Step 1: Extract fields from the page
    const fieldResponse = await chrome.tabs.sendMessage(tabId, {
      action: 'extractFields'
    });
    
    const fields = fieldResponse.fields;
    
    if (fields.length === 0) {
      return { error: 'No form fields found on this page' };
    }
    
    // Step 2: Generate answers using Claude
    const fieldMappings = await generateAnswers(fields, resume);
    
    // Step 3: Fill the form
    await chrome.tabs.sendMessage(tabId, {
      action: 'fillFields',
      fieldMappings
    });
    
    return { 
      success: true, 
      fieldsFound: fields.length,
      fieldsFilled: fieldMappings.length 
    };
    
  } catch (error) {
    console.error('Form fill error:', error);
    return { error: error.message };
  }
}
