# Focus Feed for YouTube

A Chrome extension that makes YouTube usable for studying. It hides everything except the channels you approve, so a quick lecture doesn't turn into an hour of Shorts and recommendations.

## Features
- **Allowlist mode:** only videos from your chosen channels are shown on the homepage, search results, and sidebar
- **Shorts blocker:** removes Shorts shelves entirely
- **Keyword blocking:** hide videos by title keywords (e.g. gameplay, trailer, clip)
- **My Feed page:** shows the latest uploads from your allowed channels via the YouTube Data API, with no recommendation algorithm
- **Popup controls:** toggle features and add or remove channels and keywords without editing code

## How it works
- A content script scans YouTube's video elements and hides anything that doesn't match your rules
- A recursive selector pierces YouTube's Shadow DOM, so the filter can read the page's content
- A MutationObserver re-filters as new videos load while scrolling or navigating

## Installation
1. Download or clone this repository
2. Open `chrome://extensions` in Chrome
3. Turn on **Developer mode** (top right)
4. Click **Load unpacked** and select the `focus-feed-extension` folder
5. Pin the extension and click its icon to add your channels

## Setting up My Feed (optional)
1. Create a free API key in Google Cloud Console (enable **YouTube Data API v3**)
2. Click **Open My Feed** in the popup and paste your key
3. The key is stored locally in your browser and never leaves it

## Default channels
Veritasium, Kurzgesagt, The Infographics Show, Starter Story. Change these anytime from the popup.

## Tech stack
JavaScript, Chrome Extension Manifest V3, YouTube Data API v3

## Limitations
- Channel matching uses the displayed channel name, so a typo in the channel name can hide its videos
- If YouTube changes its page structure, selectors may need updating

## License
MIT
