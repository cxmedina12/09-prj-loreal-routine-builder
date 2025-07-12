# Cloudflare Worker Deployment Guide

This guide explains how to deploy the Cloudflare Worker for secure OpenAI API access.

## Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com) (free tier available)
2. **Wrangler CLI**: Install the Cloudflare CLI tool
3. **OpenAI API Key**: Get your API key from [OpenAI](https://platform.openai.com/api-keys)

## Step-by-Step Deployment

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

This will open a browser window to authenticate with your Cloudflare account.

### 3. Set Your OpenAI API Key as a Secret

```bash
wrangler secret put OPENAI_API_KEY
```

When prompted, enter your actual OpenAI API key (e.g., `sk-...`).

### 4. Deploy the Worker

```bash
wrangler deploy
```

This will deploy your worker and provide you with a URL like:
`https://loreal-skincare-chatbot.your-subdomain.workers.dev`

### 5. Update Your Frontend Code

Replace the direct OpenAI API calls with the Cloudflare Worker URL:

1. **Option A: Replace existing script.js**

   ```bash
   cp script-worker.js script.js
   ```

2. **Option B: Update the HTML to use the worker version**

   ```html
   <!-- Replace this line in index.html -->
   <script src="script.js"></script>
   <!-- With this -->
   <script src="script-worker.js"></script>
   ```

3. **Update the Worker URL in script-worker.js**
   ```javascript
   const WORKER_URL = "https://your-actual-worker-url.workers.dev";
   ```

### 6. Remove Client-Side API Key (Optional)

Since the API key is now handled server-side, you can:

- Remove or comment out the `secrets.js` file
- Remove the script tag for `secrets.js` from `index.html`

## Security Benefits

✅ **API Key Protection**: OpenAI API key is stored securely in Cloudflare
✅ **CORS Handling**: Worker handles cross-origin requests properly
✅ **Rate Limiting**: Cloudflare provides built-in DDoS protection
✅ **Global CDN**: Fast response times worldwide
✅ **Request Validation**: Server-side validation of incoming requests

## Testing Your Deployment

1. Open your skincare chatbot in a browser
2. Select some products
3. Try asking a question in the chat
4. Click "Generate Routine" to test the full flow

## Worker Features

- **Error Handling**: Graceful error responses
- **CORS Support**: Allows requests from any origin
- **Request Validation**: Validates required fields
- **OpenAI Integration**: Direct proxy to OpenAI API
- **Flexible Configuration**: Easy to modify model parameters

## Troubleshooting

**Worker not responding?**

- Check the worker URL is correct
- Verify the API key was set: `wrangler secret list`
- Check worker logs: `wrangler tail`

**CORS errors?**

- Ensure the worker includes proper CORS headers
- Check browser console for specific error messages

**OpenAI API errors?**

- Verify your OpenAI API key has sufficient credits
- Check OpenAI API status at [status.openai.com](https://status.openai.com)

## Cost Considerations

- **Cloudflare Workers**: Free tier includes 100,000 requests/day
- **OpenAI API**: Pay per token used (estimate $0.01-0.03 per conversation)
- **Total Cost**: Very low for personal/educational use

## Next Steps

1. **Custom Domain**: Configure a custom domain for your worker
2. **Rate Limiting**: Add request rate limiting if needed
3. **Authentication**: Add user authentication if required
4. **Analytics**: Monitor usage with Cloudflare Analytics
5. **Caching**: Add response caching for common queries
