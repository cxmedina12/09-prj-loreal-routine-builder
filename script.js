/* Essential chatbot functions - clean version */

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
const STORAGE_KEY = "loreal-selected-products";

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Save selected products to localStorage */
function saveSelectedProducts() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedProducts));
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
}

/* Load selected products from localStorage */
async function loadSelectedProducts() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      selectedProducts = JSON.parse(saved);
      updateSelectedProductsList();
      if (categoryFilter.value) {
        const products = await loadProducts();
        const filteredProducts = products.filter(
          (product) => product.category === categoryFilter.value
        );
        displayProducts(filteredProducts);
      }
    }
  } catch (error) {
    console.error("Error loading from localStorage:", error);
    selectedProducts = [];
  }
}

/* Clear all selected products */
async function clearAllSelectedProducts() {
  selectedProducts = [];
  saveSelectedProducts();
  updateSelectedProductsList();

  if (categoryFilter.value) {
    const products = await loadProducts();
    const filteredProducts = products.filter(
      (product) => product.category === categoryFilter.value
    );
    displayProducts(filteredProducts);
  }

  chatWindow.innerHTML += `
    <div class="chat-message ai-message">
      <i class="fa-solid fa-check-circle"></i> All selected products have been cleared!
    </div>
  `;
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

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
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );
  displayProducts(filteredProducts);
});

/* Toggle product selection (add or remove) */
async function toggleProduct(productId) {
  const products = await loadProducts();
  const product = products.find((p) => p.id === productId);
  const isAlreadySelected = selectedProducts.find((p) => p.id === productId);

  if (isAlreadySelected) {
    selectedProducts = selectedProducts.filter((p) => p.id !== productId);
  } else {
    selectedProducts.push(product);
  }

  saveSelectedProducts();
  updateSelectedProductsList();

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
  saveSelectedProducts();
  updateSelectedProductsList();

  const currentCategory = categoryFilter.value;
  if (currentCategory) {
    const products = await loadProducts();
    const filteredProducts = products.filter(
      (product) => product.category === currentCategory
    );
    displayProducts(filteredProducts);
  }
}

/* Send message to OpenAI API via Cloudflare Worker */
async function sendChatMessage(message) {
  chatHistory.push({
    role: "user",
    content: message,
  });

  chatWindow.innerHTML += `
    <div class="chat-message user-message">
      ${message}
    </div>
  `;

  chatWindow.innerHTML += `
    <div class="chat-message ai-message loading">
      <i class="fa-solid fa-spinner fa-spin"></i> Thinking...
    </div>
  `;

  try {
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

    const systemMessage = {
      role: "system",
      content: `You are a helpful skincare expert and beauty advisor specializing in L'Oréal and partner brand products. 
      
      You help users build personalized skincare routines, answer questions about products, and provide expert advice.
      
      Current context: ${selectedProductsContext}
      
      Keep responses friendly, informative, and helpful. If users ask about specific products, refer to their selected products when relevant.`,
    };

    const messages = [systemMessage, ...chatHistory];

    const response = await fetch(
      "https://proj9loreal.cxmedina12.workers.dev/",
      {
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
      }
    );

    // Check if response is ok
    if (!response.ok) {
      throw new Error(
        `HTTP error! status: ${response.status} - ${response.statusText}`
      );
    }

    const data = await response.json();

    // Check if the response has an error
    if (data.error) {
      throw new Error(`OpenAI API Error: ${data.error.message || data.error}`);
    }

    const loadingMessage = chatWindow.querySelector(".loading");
    if (loadingMessage) {
      loadingMessage.remove();
    }

    if (data.choices && data.choices[0]) {
      const aiResponse = data.choices[0].message.content;

      chatHistory.push({
        role: "assistant",
        content: aiResponse,
      });

      chatWindow.innerHTML += `
        <div class="chat-message ai-message">
          ${aiResponse.replace(/\n/g, "<br>")}
        </div>
      `;
    } else {
      chatWindow.innerHTML += `
        <div class="chat-message ai-message error">
          Sorry, I couldn't generate a response. Please try again.
        </div>
      `;
    }
  } catch (error) {
    const loadingMessage = chatWindow.querySelector(".loading");
    if (loadingMessage) {
      loadingMessage.remove();
    }

    // Enhanced error logging for debugging
    console.error("Chat API Error:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      apiUrl: "https://proj9loreal.cxmedina12.workers.dev/",
    });

    chatWindow.innerHTML += `
      <div class="chat-message ai-message error">
        Error: Unable to connect to the chat service. Please check your internet connection.
        <br><small>Debug info: ${error.message}</small>
      </div>
    `;
  }

  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Generate routine button click handler */
generateRoutineBtn.addEventListener("click", async () => {
  if (selectedProducts.length === 0) {
    chatWindow.innerHTML += `
      <div class="chat-message ai-message">
        Please select some products first to generate a routine!
      </div>
    `;
    return;
  }

  const productNames = selectedProducts
    .map((p) => `${p.name} by ${p.brand}`)
    .join(", ");
  const message = `Create a skincare routine using these products: ${productNames}`;

  await sendChatMessage(message);
});

/* Chat form submission handler */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const userInput = document.getElementById("userInput");
  const message = userInput.value.trim();

  if (message) {
    await sendChatMessage(message);
    userInput.value = "";
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

  if (
    confirm(
      `Are you sure you want to clear all ${selectedProducts.length} selected products?`
    )
  ) {
    await clearAllSelectedProducts();
  }
});

/* Load saved products when page loads */
document.addEventListener("DOMContentLoaded", async () => {
  await loadSelectedProducts();
});
