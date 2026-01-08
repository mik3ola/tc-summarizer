# T&C Hover Summarizer

📜 **Instantly understand Terms & Conditions before you agree.**

A Chrome extension that summarizes legal documents (Terms of Service, Privacy Policies, Refund Policies) when you hover over them. Powered by AI, it highlights what actually matters — costs, cancellation policies, data usage, and red flags.

![Version](https://img.shields.io/badge/version-0.2.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- 🖱️ **Hover to Summarize** — Just hover over any Terms/Privacy link to see a summary
- 🎯 **Highlights What Matters** — Costs, cancellation, data sharing, red flags
- 📝 **Supporting Quotes** — Key clauses extracted directly from the document
- ⚡ **Smart Caching** — Summaries cached for 30 days to save time and API costs
- 🔒 **Privacy First** — Your data stays on your device (free tier uses your own API key)
- 🎨 **Beautiful UI** — Clean, dark-themed popover that doesn't get in the way

## How It Works

1. **Install the extension**
2. **Configure your API key** (free tier) or **subscribe** (coming soon)
3. **Browse normally** — the extension detects legal links automatically
4. **Hover over any Terms/Privacy link** — a summary appears after 0.75s
5. **Read the important bits** — costs, cancellation, red flags highlighted

## Installation

### From Source (Development)

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/tc-hover-summarizer.git
   cd tc-hover-summarizer
   ```

2. Open Chrome and go to `chrome://extensions`

3. Enable **Developer mode** (top right)

4. Click **Load unpacked** and select the `ai-summary-extension` folder

5. Click the extension icon → **Settings** → Add your OpenAI API key

### From Chrome Web Store (Coming Soon)

The extension will be available on the Chrome Web Store once it's ready for public release.

## Configuration

### Free Tier (Your Own API Key)

1. Get an API key from [OpenAI](https://platform.openai.com/api-keys)
2. Open extension Settings (click the extension icon)
3. Paste your API key
4. Choose your preferred model (GPT-4o Mini recommended for cost)

### Subscriber (Coming Soon)

Subscribers won't need their own API key — just login and start using!

## Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Auto-summarize on hover | Automatically show summary when hovering | ✅ On |
| Show red flags section | Highlight concerning clauses | ✅ On |
| Show supporting quotes | Include relevant quotes | ✅ On |
| Hover delay | Time before showing summary | 0.75s |

## Project Structure

```
ai-summary-extension/
├── manifest.json          # Extension manifest (MV3)
├── src/
│   ├── background.js      # Service worker (API calls, caching)
│   ├── content.js         # Content script (UI, hover detection)
│   ├── options.html       # Settings page
│   └── options.js         # Settings logic
├── icons/                 # Extension icons (TODO: add icons)
└── README.md
```

## Backend Integration (For Subscribers)

To enable the subscription model, you'll need to deploy a backend that:

1. **Authenticates users** (OAuth, email/password, etc.)
2. **Proxies API calls** to OpenAI (so users don't need their own key)
3. **Manages subscriptions** (Stripe, etc.)

Update `BACKEND_URL` in `src/background.js` with your backend URL.

### Backend API Endpoints

```
POST /api/summarize
Authorization: Bearer <token>
Body: { url: string, text: string }
Response: { summary: SummaryObject }

POST /api/auth/login
POST /api/auth/logout
GET /api/subscription/status
```

## Privacy

- **Free tier**: Your API key is stored locally and API calls go directly to OpenAI
- **Subscriber tier**: Text is sent to our backend for summarization (never stored)
- **No tracking**: We don't track what pages you visit
- **Cache is local**: Summaries are cached in your browser only

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

**Extension Code (src/, manifest.json, etc.)**: MIT License — Copyright (c) 2025 Michael Olaw

See [LICENSE](LICENSE) for full text.

**Backend Code (backend/)**: Proprietary — All Rights Reserved

See [backend/LICENSE](backend/LICENSE) for details. The backend API, database schema, and server-side code are proprietary and not licensed for use.

## Acknowledgments

- Powered by OpenAI GPT-4o
- Built with ❤️ to help people understand what they're agreeing to
