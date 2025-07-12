/**
 * Cloudflare Worker for L'Oréal Skincare Chatbot
 * Proxies OpenAI API requests and adds API key server-side for security
 */

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // Only allow POST requests
    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    try {
      // Parse the incoming request body
      const requestData = await request.json();

      // Validate required fields
      if (!requestData.messages || !Array.isArray(requestData.messages)) {
        return new Response(
          JSON.stringify({
            error: "Invalid request: messages array is required",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      // Prepare the OpenAI API request
      const openaiRequest = {
        model: requestData.model || "gpt-4o",
        messages: requestData.messages,
        max_tokens: requestData.max_tokens || 600,
        temperature: requestData.temperature || 0.7,
      };

      // Make the request to OpenAI API
      const openaiResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(openaiRequest),
        }
      );

      // Get the response from OpenAI
      const openaiData = await openaiResponse.json();

      // Return the response with CORS headers
      return new Response(JSON.stringify(openaiData), {
        status: openaiResponse.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      // Handle errors
      console.error("Worker error:", error);
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: error.message,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
  },
};
