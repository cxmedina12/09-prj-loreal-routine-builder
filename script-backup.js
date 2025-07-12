/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");
const clearAllBtn = document.getElementById("clearAllBtn");

/* Array to store selected products */
let selectedProducts = [];

/* Array to store chat history for context */
let chatHistory = [];

/* localStorage key for selected products */
const STORAGE_KEY = 'loreal-selected-products';

/* Save selected products to localStorage */
function saveSelectedProducts() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedProducts));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

/* Load selected products from localStorage */
async function loadSelectedProducts() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      selectedProducts = JSON.parse(saved);
      updateSelectedProductsList();
      /* Update product cards if category is selected */
      if (categoryFilter.value) {
        const products = await loadProducts();
        const filteredProducts = products.filter(
          (product) => product.category === categoryFilter.value
        );
        displayProducts(filteredProducts);
      }
    }
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    selectedProducts = [];
  }
}

/* Clear all selected products */
async function clearAllSelectedProducts() {
  selectedProducts = [];
  saveSelectedProducts();
  updateSelectedProductsList();
  
  /* Update product cards if category is selected */
  if (categoryFilter.value) {
    const products = await loadProducts();
    const filteredProducts = products.filter(
      (product) => product.category === categoryFilter.value
    );
    displayProducts(filteredProducts);
  }
  
  /* Show confirmation message */
  chatWindow.innerHTML += `
    <div class="chat-message ai-message">
      <i class="fa-solid fa-check-circle"></i> All selected products have been cleared!
    </div>
  `;
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map((product) => {
      /* Check if product is already selected to show correct state */
      const isSelected = selectedProducts.find((p) => p.id === product.id);
      const selectedClass = isSelected ? "selected" : "";
      const buttonText = isSelected ? "Remove" : "Select Product";

      return `
    <div class="product-card ${selectedClass}" data-product-id="${product.id}" onclick="toggleProduct(${product.id})">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
        <div class="product-description">
          <p>${product.description}</p>
        </div>
        <button class="select-btn" onclick="event.stopPropagation(); toggleProduct(${product.id})">
          ${buttonText}
        </button>
      </div>
    </div>
  `;
    })
    .join("");
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

/* Toggle product selection (add or remove) */
async function toggleProduct(productId) {
  const products = await loadProducts();
  const product = products.find((p) => p.id === productId);

  /* Check if product is already selected */
  const isAlreadySelected = selectedProducts.find((p) => p.id === productId);

  if (isAlreadySelected) {
    /* Remove product from selected list */
    selectedProducts = selectedProducts.filter((p) => p.id !== productId);
  } else {
    /* Add product to selected list */
    selectedProducts.push(product);
  }

  /* Save to localStorage */
  saveSelectedProducts();

  /* Update both the selected products list and the product cards display */
  updateSelectedProductsList();

  /* Re-render the current category to update card states */
  const currentCategory = categoryFilter.value;
  if (currentCategory) {
    const filteredProducts = products.filter(
      (product) => product.category === currentCategory
    );
    displayProducts(filteredProducts);
  }
}

/* Update the selected products display */
function updateSelectedProductsList() {
  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
      <div class="selected-product-item">
        <span>${product.name} - ${product.brand}</span>
        <button onclick="removeProduct(${product.id})" class="remove-btn">×</button>
      </div>
    `
    )
    .join("");
}

/* Remove product from selected products */
async function removeProduct(productId) {
  selectedProducts = selectedProducts.filter((p) => p.id !== productId);
  
  /* Save to localStorage */
  saveSelectedProducts();
  
  updateSelectedProductsList();

  /* Re-render the current category to update card states */
  const currentCategory = categoryFilter.value;
  if (currentCategory) {
    const products = await loadProducts();
    const filteredProducts = products.filter(
      (product) => product.category === currentCategory
    );
    displayProducts(filteredProducts);
  }
}

/* Generate routine button click handler */
generateRoutineBtn.addEventListener("click", async () => {
  if (selectedProducts.length === 0) {
    chatWindow.innerHTML = `
      <div class="chat-message ai-message">
        Please select some products first to generate a routine!
      </div>
    `;
    return;
  }

  /* Create structured product data to send to OpenAI */
  const productData = selectedProducts.map((product) => ({
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description,
  }));

  /* Call OpenAI API to generate routine with product data */
  await sendProductDataToOpenAI(productData);
});

/* Send product data to OpenAI API for routine generation */
async function sendProductDataToOpenAI(productData) {
  /* Create the routine generation message */
  const productNames = productData.map(p => `${p.name} by ${p.brand}`).join(", ");
  const routineMessage = `Generate a skincare routine using these products: ${productNames}`;

  /* Add this as a special routine generation message to chat history */
  chatHistory.push({
    role: "user",
    content: `Please create a personalized skincare routine using these specific products: ${JSON.stringify(productData, null, 2)}`
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
      
      Keep responses friendly, detailed, and easy to follow.`
    };

    /* Prepare messages array with system message and chat history */
    const messages = [systemMessage, ...chatHistory];

    /* Make request to Cloudflare Worker (which proxies to OpenAI) */
    const response = await fetch(OPENAI_API_URL, {
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
        content: aiResponse
      });

      /* Display AI response */
      chatWindow.innerHTML += `
        <div class="chat-message ai-message">
          <h4>🌟 Your Personalized Skincare Routine</h4>
          <div class="routine-response">
            ${aiResponse.replace(/\n/g, '<br>')}
          </div>
        </div>
      `;
    } else {
      chatWindow.innerHTML += `
        <div class="chat-message ai-message error">
          Sorry, I couldn't generate your routine. Please check your API key and try again.
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
        <strong>Error:</strong> Unable to connect to OpenAI API. Please check your API key and internet connection.
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

  try {
    /* Create detailed prompt with product data */
    const prompt = `Please create a personalized skincare routine using these specific products. 
    Here is the detailed product information:
    
    ${JSON.stringify(productData, null, 2)}
    
    Please provide:
    1. The order to use these products (morning/evening routine)
    2. How to use each product properly
    3. Any tips or warnings about combining these products
    4. Expected benefits from this routine
    
    Keep the response friendly, informative, and easy to follow.`;

    /* Make request to Cloudflare Worker (which proxies to OpenAI) */
    const response = await fetch(OPENAI_API_URL, {
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
      chatWindow.innerHTML += `
        <div class="chat-message ai-message">
          <h4>🌟 Your Personalized Skincare Routine</h4>
          <div class="routine-response">
            ${data.choices[0].message.content.replace(/\n/g, "<br>")}
          </div>
        </div>
      `;
    } else {
      chatWindow.innerHTML += `
        <div class="chat-message ai-message error">
          Sorry, I couldn't generate your routine. Please check your API key and try again.
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
        <strong>Error:</strong> Unable to connect to OpenAI API. Please check your API key and internet connection.
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

/* Send message to OpenAI API */
async function sendChatMessage(message) {
  /* Add user message to chat history */
  chatHistory.push({
    role: "user",
    content: message
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
    const selectedProductsContext = selectedProducts.length > 0 
      ? `\n\nCurrently selected products:\n${JSON.stringify(selectedProducts.map(p => ({
          name: p.name,
          brand: p.brand,
          category: p.category,
          description: p.description
        })), null, 2)}`
      : "\n\nNo products currently selected.";

    /* Create system message with context */
    const systemMessage = {
      role: "system",
      content: `You are a helpful skincare expert and beauty advisor specializing in L'Oréal and partner brand products. 
      
      You help users build personalized skincare routines, answer questions about products, and provide expert advice.
      
      Current context: ${selectedProductsContext}
      
      Keep responses friendly, informative, and helpful. If users ask about specific products, refer to their selected products when relevant.`
    };

    /* Prepare messages array with system message, chat history, and current message */
    const messages = [systemMessage, ...chatHistory];

    /* Make request to Cloudflare Worker (which proxies to OpenAI) */
    const response = await fetch(OPENAI_API_URL, {
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
        content: aiResponse
      });

      /* Display AI response */
      chatWindow.innerHTML += `
        <div class="chat-message ai-message">
          ${aiResponse.replace(/\n/g, '<br>')}
        </div>
      `;
    } else {
      chatWindow.innerHTML += `
        <div class="chat-message ai-message error">
          Sorry, I couldn't generate a response. Please check your API key and try again.
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
        Error: Unable to connect to OpenAI API. Please check your API key and internet connection.
        <br><br>
        <strong>Error Details:</strong> ${error.message}
      </div>
    `;
  }

  /* Scroll to bottom of chat */
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Enhanced chat form handler */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userInput = document.getElementById("userInput");
  const message = userInput.value.trim();

  if (message) {
    await sendChatMessage(message);
    userInput.value = ""; // Clear input field
  }
});

/* Clear all button event listener */
clearAllBtn.addEventListener("click", async () => {
  if (selectedProducts.length === 0) {
    chatWindow.innerHTML += `
      <div class="chat-message ai-message">
        <i class="fa-solid fa-info-circle"></i> No products selected to clear.
      </div>
    `;
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return;
  }

  /* Show confirmation */
  if (confirm(`Are you sure you want to clear all ${selectedProducts.length} selected products?`)) {
    await clearAllSelectedProducts();
  }
});

/* Load saved products when page loads */
document.addEventListener("DOMContentLoaded", async () => {
  await loadSelectedProducts();
});
