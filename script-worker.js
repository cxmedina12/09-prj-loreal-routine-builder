/* Cloudflare Worker Configuration for secure API calls */
/* Replace with your actual Cloudflare Worker URL after deployment */
const WORKER_URL = "https://proj9loreal.cxmedina12.workers.dev/";

/* Send message to OpenAI API via Cloudflare Worker */
async function sendChatMessage(message) {
  /* Add user message to chat history */
  chatHistory.push({
    role: "user",
    content: message,
  });

  /* Display user message */
  chatWindow.innerHTML += `
    <div class="chat-message user-message">
      ${message}
    </div>
  `;

  /* Show loading indicator */
  chatWindow.innerHTML += `
    <div class="chat-message ai-message loading">
      <i class="fa-solid fa-spinner fa-spin"></i> Thinking...
    </div>
  `;

  try {
    /* Create context about selected products */
    const selectedProductsContext =
      selectedProducts.length > 0
        ? `\n\nCurrently selected products:\n${JSON.stringify(
            selectedProducts.map((p) => ({
              name: p.name,
              brand: p.brand,
              category: p.category,
              description: p.description,
            })),
            null,
            2
          )}`
        : "\n\nNo products currently selected.";

    /* Create system message with context */
    const systemMessage = {
      role: "system",
      content: `You are a helpful skincare expert and beauty advisor specializing in L'Oréal and partner brand products. 
      
      You help users build personalized skincare routines, answer questions about products, and provide expert advice.
      
      Current context: ${selectedProductsContext}
      
      Keep responses friendly, informative, and helpful. If users ask about specific products, refer to their selected products when relevant.`,
    };

    /* Prepare messages array with system message, chat history, and current message */
    const messages = [systemMessage, ...chatHistory];

    /* Make request to Cloudflare Worker (which proxies to OpenAI) */
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: messages,
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    /* Remove loading indicator */
    const loadingMessage = chatWindow.querySelector(".loading");
    if (loadingMessage) {
      loadingMessage.remove();
    }

    /* Display AI response */
    if (data.choices && data.choices[0]) {
      const aiResponse = data.choices[0].message.content;

      /* Add AI response to chat history */
      chatHistory.push({
        role: "assistant",
        content: aiResponse,
      });

      /* Display AI response */
      chatWindow.innerHTML += `
        <div class="chat-message ai-message">
          ${aiResponse.replace(/\n/g, "<br>")}
        </div>
      `;
    } else {
      chatWindow.innerHTML += `
        <div class="chat-message ai-message error">
          Sorry, I couldn't generate a response. Please try again.
          <br><br>
          <strong>Debug Info:</strong> ${JSON.stringify(data, null, 2)}
        </div>
      `;
    }
  } catch (error) {
    /* Remove loading indicator */
    const loadingMessage = chatWindow.querySelector(".loading");
    if (loadingMessage) {
      loadingMessage.remove();
    }

    /* Show error message */
    chatWindow.innerHTML += `
      <div class="chat-message ai-message error">
        Error: Unable to connect to the chat service. Please check your internet connection and try again.
        <br><br>
        <strong>Error Details:</strong> ${error.message}
      </div>
    `;
  }

  /* Scroll to bottom of chat */
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Send product data to OpenAI API for routine generation via Cloudflare Worker */
async function sendProductDataToOpenAI(productData) {
  /* Create the routine generation message */
  const productNames = productData
    .map((p) => `${p.name} by ${p.brand}`)
    .join(", ");
  const routineMessage = `Generate a skincare routine using these products: ${productNames}`;

  /* Add this as a special routine generation message to chat history */
  chatHistory.push({
    role: "user",
    content: `Please create a personalized skincare routine using these specific products: ${JSON.stringify(
      productData,
      null,
      2
    )}`,
  });

  /* Display user message showing selected products */
  chatWindow.innerHTML += `
    <div class="chat-message user-message">
      <strong>🌟 Generate Routine Request</strong><br>
      ${routineMessage}
    </div>
  `;

  /* Show loading indicator */
  chatWindow.innerHTML += `
    <div class="chat-message ai-message loading">
      <i class="fa-solid fa-spinner fa-spin"></i> Creating your personalized routine...
    </div>
  `;

  try {
    /* Create detailed system message for routine generation */
    const systemMessage = {
      role: "system",
      content: `You are a professional skincare expert and beauty advisor specializing in L'Oréal and partner brand products. 
      
      Create detailed, personalized skincare routines based on the specific products provided. Always consider product compatibility, proper usage order, and skin safety.
      
      For routine generation, provide:
      1. Morning and evening routine order
      2. How to use each product properly
      3. Tips for combining products safely
      4. Expected benefits from this routine
      5. Any warnings or precautions
      
      Keep responses friendly, detailed, and easy to follow.`,
    };

    /* Prepare messages array with system message and chat history */
    const messages = [systemMessage, ...chatHistory];

    /* Make request to Cloudflare Worker (which proxies to OpenAI) */
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: messages,
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    /* Remove loading indicator */
    const loadingMessage = chatWindow.querySelector(".loading");
    if (loadingMessage) {
      loadingMessage.remove();
    }

    /* Display AI response */
    if (data.choices && data.choices[0]) {
      const aiResponse = data.choices[0].message.content;

      /* Add AI response to chat history */
      chatHistory.push({
        role: "assistant",
        content: aiResponse,
      });

      /* Display AI response */
      chatWindow.innerHTML += `
        <div class="chat-message ai-message">
          <h4>🌟 Your Personalized Skincare Routine</h4>
          <div class="routine-response">
            ${aiResponse.replace(/\n/g, "<br>")}
          </div>
        </div>
      `;
    } else {
      chatWindow.innerHTML += `
        <div class="chat-message ai-message error">
          Sorry, I couldn't generate your routine. Please try again.
          <br><br>
          <strong>Selected Products Data:</strong>
          <pre>${JSON.stringify(productData, null, 2)}</pre>
        </div>
      `;
    }
  } catch (error) {
    /* Remove loading indicator */
    const loadingMessage = chatWindow.querySelector(".loading");
    if (loadingMessage) {
      loadingMessage.remove();
    }

    /* Show error message with product data for debugging */
    chatWindow.innerHTML += `
      <div class="chat-message ai-message error">
        <strong>Error:</strong> Unable to connect to the chat service. Please check your internet connection and try again.
        <br><br>
        <strong>Selected Products Data:</strong>
        <pre>${JSON.stringify(productData, null, 2)}</pre>
        <br>
        <strong>Error Details:</strong> ${error.message}
      </div>
    `;
  }

  /* Scroll to bottom of chat */
  chatWindow.scrollTop = chatWindow.scrollHeight;
}
