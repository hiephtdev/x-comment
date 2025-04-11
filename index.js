// index.js
import { Scraper } from 'agent-twitter-client';
import delay from 'delay';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';
dotenv.config();

const TARGET_USERNAME = 'QuoteChain_AI';

// System prompt định hình phong cách của AI
// Bạn có thể thay đổi nội dung này để điều chỉnh phong cách của AI
// Ví dụ: "Hãy viết một bình luận hài hước và dí dỏm"
// "Hãy viết một bình luận nghiêm túc và chuyên nghiệp"
// "Hãy viết một bình luận thân thiện và gần gũi"
// "Hãy viết một bình luận ngắn gọn và súc tích"
// "Hãy viết một bình luận sâu sắc và triết lý"
const SYSTEM_PROMP = ""


const COMMENTED_LOG_FILE = path.resolve('./commented_tweets.txt');
const COOKIES_FILE = path.resolve('./twitter_cookies.json');

// Exponential backoff settings
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 5000; // 5 seconds

let model = "gpt-4o-mini";

let openai = new OpenAI({
    apiKey: process.env.AI_API_KEY,
});

if (process.env.AI_URL) {
    openai = new OpenAI({
        baseURL: process.env.AI_URL,
        apiKey: process.env.AI_API_KEY,
    });
    model = process.env.AI_MODEL;
}

function loadCommentedTweets() {
    if (!fs.existsSync(COMMENTED_LOG_FILE)) return new Set();
    const data = fs.readFileSync(COMMENTED_LOG_FILE, 'utf-8');
    return new Set(data.split('\n').filter(Boolean));
}

function saveCommentedTweet(tweetId) {
    fs.appendFileSync(COMMENTED_LOG_FILE, `${tweetId}\n`);
}

async function getStyleContext(scraper, userId) {
    const quotedComments = [];
    const tweetsGenerator = await scraper.getUserTweets(userId, 100);

    try {
        for (const tweet of tweetsGenerator.tweets) {
            if (tweet.quotedStatus) {
                const quotedText = tweet.quotedStatus.text;
                if (quotedText) quotedComments.unshift(quotedText);
            }
        }
    } catch (error) {
        console.error('Error fetching style context:', error);
    }

    return quotedComments;
}
async function generateStyledComment(quotedComments) {
    const contextStyle = quotedComments.slice(0, 50).map((c, i) => `${i + 1}. ${c}`).join('\n');

    const completion = await openai.chat.completions.create({
        model: model,
        messages: [
            {
                role: 'system',
                content: SYSTEM_PROMP,
            },
            {
                role: 'user',
                content: `Use the following samples as a *vibe/style* reference ONLY:\n${contextStyle}\n\nGenerate ONE original comment`,
            },
        ],
        temperature: 1.0,
    });

    let content = completion.choices[0].message.content.trim();

    if (content) {
        content = content.replace(/@QuoteChain_AI/g, '');
    }
    console.log('Generated comment:', content);
    return content;
}

import { Cookie } from 'tough-cookie';

// Helper function to load saved cookies
function loadSavedCookies() {
    try {
        if (fs.existsSync(COOKIES_FILE)) {
            const cookiesData = fs.readFileSync(COOKIES_FILE, 'utf8');
            const rawCookies = JSON.parse(cookiesData);
            return rawCookies.map(cookieData => Cookie.fromJSON(cookieData));
        }
    } catch (error) {
        console.error('Error loading cookies:', error);
    }
    return null;
}

// Helper function to save cookies 
function saveCookies(cookies) {
    try {
        // Convert cookies to JSON-serializable format
        const cookiesData = cookies.map(cookie => cookie.toJSON());
        fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookiesData, null, 2));
    } catch (error) {
        console.error('Error saving cookies:', error);
    }
}

// Helper function to implement retry with exponential backoff
async function withRetry(operation, retries = MAX_RETRIES, delay = INITIAL_RETRY_DELAY) {
    try {
        return await operation();
    } catch (error) {
        if (retries > 0) {
            console.log(`Retrying in ${delay / 1000}s... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return withRetry(operation, retries - 1, delay * 2);
        }
        throw error;
    }
}

async function initScraper() {
    const scraper = new Scraper();

    // Try to load saved cookies first
    const savedCookies = loadSavedCookies();
    if (savedCookies) {
        try {
            await scraper.setCookies(savedCookies);
            const isLoggedIn = await scraper.isLoggedIn();
            if (isLoggedIn) {
                console.log('Restored previous session successfully');
                return scraper;
            }
        } catch (error) {
            console.warn('Failed to restore previous session:', error.message);
        }
    }

    try {
        // If no valid cookies, login normally
        await scraper.login(
            process.env.TWITTER_USERNAME,
            process.env.TWITTER_PASSWORD,
            process.env.TWITTER_EMAIL || "",
            process.env.TWITTER_2FA_SECRET,
            process.env.TWITTER_API_KEY,
            process.env.TWITTER_API_SECRET,
            process.env.TWITTER_ACCESS_TOKEN,
            process.env.TWITTER_ACCESS_SECRET
        );
        // const token = scraper.authenticatePeriscope();

        // Verify login was successful
        const isLoggedIn = await scraper.isLoggedIn();
        if (!isLoggedIn) {
            throw new Error('Login failed - could not verify session');
        }

        // Save new cookies
        const newCookies = await scraper.getCookies();
        if (newCookies && newCookies.length > 0) {
            saveCookies(newCookies);
            console.log('Saved new session cookies');
        }

        return scraper;
    } catch (error) {
        console.error('Login failed:', error.message);
        return null;
    }
}

async function main() {
    const scraper = await initScraper();
    if (!scraper) {
        console.error('Failed to initialize scraper. Please check your credentials.');
        return;
    }
    const userId = await scraper.getUserIdByScreenName(TARGET_USERNAME);
    if (!userId) {
        console.error(`User ${TARGET_USERNAME} not found.`);
        return;
    }
    const quotedComments = await getStyleContext(scraper, userId);
    const commentedSet = loadCommentedTweets();

    const userTweets = await scraper.getUserTweets(userId, 100);
    let hasInitialTweets = false;

    try {
        if (!userTweets || userTweets.tweets.length === 0) {
            console.log('No tweets found for user');
            return;
        }
        for (const tweet of userTweets.tweets) {
            hasInitialTweets = true;
            if (commentedSet.has(tweet.id)) continue;

            const aiComment = await generateStyledComment(quotedComments);
            await scraper.sendLongTweet(aiComment, tweet.id);
            await delay(20000);
            saveCommentedTweet(tweet.id);
            commentedSet.add(tweet.id);
            console.log(`✅ Replied to tweet ${tweet.id} with AI-style comment.`);
        }
    } catch (error) {
        console.error('Error processing initial tweets:', error);
        return;
    }

    if (!hasInitialTweets) {
        console.log('No tweets found for user');
        return;
    }

    // lấy số lớn nhất trong commentedSet đã lưu 
    let lastKnownTweetId = null;
    if (commentedSet.size > 0) {
        lastKnownTweetId = commentedSet.size > 0 ? `${[...commentedSet].reduce((a, b) => BigInt(a) > BigInt(b) ? a : b)}` : null;
    }
    console.log('👀 Listening for new tweets...');

    while (true) {
        try {
            let latestTweet = null;
            const latestTweetsGenerator = await scraper.getUserTweets(userId, 100);

            try {
                if (!latestTweetsGenerator) {
                    console.log('No tweets found for user');
                    await delay(15000);
                    continue;
                }
                for (const tweet of latestTweetsGenerator.tweets) {
                    if (commentedSet.has(tweet.id)) continue;
                    if (lastKnownTweetId && tweet.id <= lastKnownTweetId) continue;
                    if (tweet.quotedStatus) {
                        const quotedText = tweet.quotedStatus.text;
                        if (quotedText) quotedComments.unshift(quotedText);
                    }
                    latestTweet = tweet;
                    break; // We only need the first one
                }
            } catch (error) {
                console.error('Error fetching latest tweet:', error);
                await delay(15000);
                continue;
            }

            if (!latestTweet) {
                // console.log('No new tweets found');
                await delay(15000);
                continue;
            }

            // Initialize lastKnownTweetId if it's the first run
            if (lastKnownTweetId === null) {
                lastKnownTweetId = latestTweet.id;
                continue;
            }

            if (latestTweet.id !== lastKnownTweetId && !commentedSet.has(latestTweet.id)) {
                console.log(`🚨 New tweet detected: ${latestTweet.id}`);

                const comment = await generateStyledComment(quotedComments);
                // const comment2 = await generateStyledComment(quotedComments);

                // Use retry logic for sending tweets
                await scraper.sendLongTweet(comment, `${latestTweet.id}`);
                console.log(`✅ Replied to tweet ${latestTweet.id} with AI-style comment.`);
                // await delay(2000);
                // await withRetry(() => scraper.sendTweet(comment2, latestTweet.id));

                saveCommentedTweet(latestTweet.id);
                commentedSet.add(latestTweet.id);
                lastKnownTweetId = latestTweet.id;
            }
        } catch (error) {
            console.error('Error in main loop:', error);
        }
        await delay(15000); // Poll every 15s
    }
}

main().catch(console.error);
