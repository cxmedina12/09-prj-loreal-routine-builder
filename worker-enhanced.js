/**
 * Enhanced Cloudflare Worker for L'Oréal Skincare Chatbot
 * Proxies OpenAI API requests with improved error handling and logging
 */

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // Only allow POST requests
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({
          error: "Method not allowed",
          message: "Only POST requests are supported",
        }),
        {
          status: 405,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    try {
      // Check if API key is configured
      if (!env.OPENAI_API_KEY) {
        console.error("OPENAI_API_KEY environment variable is not set");
        return new Response(
          JSON.stringify({
            error: "Configuration error",
            message: "OpenAI API key is not configured",
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

      // Parse the incoming request body
      const requestData = await request.json();
      console.log("Received request:", {
        model: requestData.model,
        messageCount: requestData.messages?.length,
        maxTokens: requestData.max_tokens,
      });

      // Validate required fields
      if (!requestData.messages || !Array.isArray(requestData.messages)) {
        return new Response(
          JSON.stringify({
            error: "Invalid request",
            message: "messages array is required",
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

      // Validate messages format
      for (const message of requestData.messages) {
        if (!message.role || !message.content) {
          return new Response(
            JSON.stringify({
              error: "Invalid request",
              message: "Each message must have 'role' and 'content' fields",
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
      }

      // Prepare the OpenAI API request
      const openaiRequest = {
        model: requestData.model || "gpt-4o",
        messages: requestData.messages,
        max_tokens: requestData.max_tokens || 600,
        temperature: requestData.temperature || 0.7,
        stream: false, // Ensure streaming is disabled
      };

      console.log("Making OpenAI request with model:", openaiRequest.model);

      // Make the request to OpenAI API
      const openaiResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
            "User-Agent": "L'Oreal-Chatbot/1.0",
          },
          body: JSON.stringify(openaiRequest),
        }
      );

      // Get the response from OpenAI
      const openaiData = await openaiResponse.json();

      // Log the response status
      console.log("OpenAI response status:", openaiResponse.status);

      // Handle OpenAI API errors
      if (!openaiResponse.ok) {
        console.error("OpenAI API error:", openaiData);

        // Return specific error messages based on status code
        let errorMessage = "OpenAI API request failed";
        if (openaiResponse.status === 401) {
          errorMessage = "Invalid OpenAI API key";
        } else if (openaiResponse.status === 429) {
          errorMessage = "OpenAI API rate limit exceeded";
        } else if (openaiResponse.status === 500) {
          errorMessage = "OpenAI API server error";
        }

        return new Response(
          JSON.stringify({
            error: errorMessage,
            details: openaiData.error?.message || "Unknown error",
            status: openaiResponse.status,
          }),
          {
            status: openaiResponse.status,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      // Validate OpenAI response format
      if (!openaiData.choices || !openaiData.choices[0]) {
        console.error("Invalid OpenAI response format:", openaiData);
        return new Response(
          JSON.stringify({
            error: "Invalid response format",
            message: "OpenAI API returned unexpected response format",
          }),
          {
            status: 502,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      console.log("Successfully processed OpenAI request");

      // Return the successful response with CORS headers
      return new Response(JSON.stringify(openaiData), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache",
        },
      });
    } catch (error) {
      // Handle unexpected errors
      console.error("Worker error:", error);

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: error.message || "An unexpected error occurred",
          timestamp: new Date().toISOString(),
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
