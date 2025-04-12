# x-comment – Twitter Auto Comment Bot

A Twitter auto-comment bot using OpenAI or Grok to generate intelligent responses.

## Requirements

- Node.js (version 22 or higher)
- Twitter account
- API key from OpenAI or Grok

## Installation

1. Clone the repository:

```bash
git clone https://github.com/hiephtdev/x-comment
cd x-comment
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file based on `.env.sample` and fill in your values.

4. Run the bot:

```bash
# If using the executable file
./x-comment

# If building from source
node index.js
```

## Usage

- Logs into Twitter
- Follows the specified account
- Comments on new tweets using AI-generated content
- Avoids commenting on the same tweet twice by logging commented tweet IDs

## Configuration

- `commented_tweets.txt` is used to store commented tweets
- Bot will default to `QuoteChain_AI` for monitoring
- Change the AI model via the `AI_MODEL` value in `.env`

## Modifying the System Prompt

To change the AI's commenting style, update the `SYSTEM_PROMP` constant in `index.js`. For example:

```javascript
const SYSTEM_PROMP = "Write a humorous and witty comment.";
```

You can modify it to match your desired tone, such as:

- "Write a serious and professional comment."
- "Write a friendly and approachable comment."
- "Write a concise and succinct comment."
- "Write a deep and philosophical comment."

## Security

- Never share your `.env` file or credentials
- Use 2FA on Twitter for extra protection