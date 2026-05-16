# ActivityWatch Title Rules

A Manifest V3 Chrome extension that labels tab titles from user-defined URL rules. It is designed to make ActivityWatch logs and timelines easier to identify without changing the page content itself.

## Features

- Match by domain, URL substring, optional regular expression, or any combination of those fields on the same rule.
- Prepend or append custom text to the original page title.
- Enable, disable, add, and remove unlimited rules from the options page.
- Add a new domain rule directly from the live preview URL/domain field.
- Switch the options page between light mode and a dark theme that uses `#0F0F1F` as the background.
- Store all rules locally with `chrome.storage.local`.
- Import and export rule sets as JSON.
- React to page title changes, history API navigation, hash changes, tab URL updates, and storage changes without DOM polling.
- Preserve the original page title and avoid repeated duplicate prefixes or suffixes.

## Project structure

```text
manifest.json                 Extension metadata, permissions, options page, service worker, and content scripts.
scripts/background.js          Installs example rules and nudges tabs when Chrome reports URL/title updates.
scripts/content.js             Applies matching rules in pages and observes title/SPA changes.
scripts/default-rules.js       Example configuration used on first install and by the options page.
scripts/rule-engine.js         Shared rule normalization, matching, title cleanup, and preview helpers.
options/options.html           Minimal settings UI.
options/options.css            Modern spacing, typography, cards, and toggle styles.
options/options.js             Rule editor, local persistence, live preview, quick-add, import, and export.
```

## Example default rules

- `youtube.com` → prepend `[YT]`
- `school.example.edu` → append `[School]` (disabled placeholder)
- `docs.google.com` → prepend `[Writing]`

## Install locally

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select this repository folder.
5. Click the extension from the toolbar/puzzle-piece menu, or open the extension options page, to edit rules.

## Rule JSON shape

```json
{
  "rules": [
    {
      "id": "example-youtube",
      "enabled": true,
      "name": "YouTube",
      "domainPattern": "youtube.com",
      "urlPattern": "/watch",
      "regexPattern": "",
      "mode": "prepend",
      "text": "[YT]"
    }
  ]
}
```

Leave any matcher field blank to ignore it. If `domainPattern`, `urlPattern`, and `regexPattern` are all filled in, the rule applies only when all three match. Older imports that still use `matchType` and `pattern` are converted automatically.
