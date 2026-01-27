# TermsDigest

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

### From Chrome Web Store

1. Visit the [Chrome Web Store listing](https://chrome.google.com/webstore/detail/termsdigest/[extension-id])
2. Click **Add to Chrome**
3. Click **Add Extension** to confirm
4. Click the extension icon → **Options** → Sign in or add your OpenAI API key

**Note**: The extension is only available through the Chrome Web Store. Source code is not publicly available for security and licensing reasons.

## Configuration

### Free Tier (5 Summaries/Month)

1. Click the extension icon → **Options**
2. Click **Sign in** or **Create account**
3. Get 5 free summaries per month (no API key needed!)

### Pro Tier (£4.99/year - Limited Time)

1. Click the extension icon → **Options**
2. Click **Upgrade to Pro**
3. Get 50 summaries per month + unlimited with your own API key

### Bring Your Own API Key (Pro Only)

Pro subscribers can use their own OpenAI API key for unlimited summaries:
1. Get an API key from [OpenAI](https://platform.openai.com/api-keys)
2. Open extension **Options**
3. Paste your API key in the **API Settings** section
4. Choose your preferred model (GPT-4o Mini recommended for cost)

## Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Auto-summarize on hover | Automatically show summary when hovering | ✅ On |
| Show red flags section | Highlight concerning clauses | ✅ On |
| Show supporting quotes | Include relevant quotes | ✅ On |
| Hover delay | Time before showing summary | 0.75s |

## Privacy Policy

For detailed information about how we collect, use, and protect your data, please see our [Privacy Policy](https://termsdigest.com/privacy).

**Quick Summary:**
- **Free tier**: Your data stays local. We only track usage count for quota enforcement.
- **Pro tier**: Text content is sent to our backend for summarization but **never stored**. Only usage statistics are kept.
- **No tracking**: We don't track which websites you visit or collect browsing history.
- **Local cache**: Summaries are cached locally in your browser for 30 days.

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
