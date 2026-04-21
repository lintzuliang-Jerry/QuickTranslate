# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QuickTranslate is a Chrome Extension (Manifest V3) that translates selected English text to Traditional Chinese. Users select text, press Ctrl, and a floating tooltip appears with the translation powered by the MyMemory Translation API (free, no API key required).

## Architecture

- **background.js** — Service worker that receives translation requests from the content script, calls the MyMemory API, and returns results.
- **content_script.js** — Injected into all pages. Tracks text selection and mouse position, listens for Ctrl key (keyup, not keydown — only fires if no other key was pressed during the Ctrl hold), shows/updates/removes the floating tooltip (`#qt-tooltip`).
- **content_style.css** — Styles for the tooltip, including dark mode support via `prefers-color-scheme`.
- **popup.html** — Extension popup showing usage instructions.

## Key Data Flow

1. `mouseup` captures selected text and cursor position
2. `keyup` (Ctrl only, no combo) triggers `showTooltip()` + sends `{action: "translate", text}` to background
3. Background fetches MyMemory API (`https://api.mymemory.translated.net/get?q=...&langpair=en|zh-TW`) and responds with `{success, translation/error}`
4. Content script calls `updateTooltip()` with the result

## Development Conventions

- Pure vanilla JavaScript — no frameworks, no ES modules (service workers and content scripts don't support import/export)
- All CSS class names use `qt-` prefix to avoid conflicts with host pages
- Tooltip element is appended directly to `document.body` (no Shadow DOM)
- The `onMessage` listener in background.js must `return true` to support async `sendResponse`
- Text selection is capped at 5000 characters before sending to the API
- No API key required — MyMemory free tier allows 5000 chars/day anonymously
- Event listeners use capture phase (`true` as third arg) to intercept pages that call `stopPropagation`

## Testing

No automated tests. Manual testing only:

1. Open `chrome://extensions/`, enable Developer Mode
2. Click "Load unpacked" and select this project folder
3. Go to any English webpage, select text, press Ctrl — tooltip should appear
4. After modifying code, click the reload button on `chrome://extensions/` (content script changes require refreshing the target page too)

## Spec Reference

[quick-translate-spec.md](quick-translate-spec.md) contains the full development specification including UI mockups, API format, error handling matrix, and edge cases.
