importScripts("default-rules.js", "rule-engine.js");

const { RULES_STORAGE_KEY } = TitleRuleEngine;

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  // Install readable starter rules only once. Existing user rules are never
  // overwritten during extension updates.
  const stored = await chrome.storage.local.get(RULES_STORAGE_KEY);
  if (!stored[RULES_STORAGE_KEY]) {
    await chrome.storage.local.set({
      [RULES_STORAGE_KEY]: TitleRulesDefaults.cloneRules()
    });
  }

  if (reason === "install") {
    chrome.runtime.openOptionsPage();
  }
});

chrome.action.onClicked.addListener(() => {
  // The toolbar / puzzle-piece entry is the fastest path for non-technical
  // users to change rules, so clicking the extension opens settings directly.
  chrome.runtime.openOptionsPage();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // SPAs often update only their URL or title. This message nudges the content
  // script without forcing any polling loop in either process.
  if (changeInfo.url || changeInfo.title || changeInfo.status === "complete") {
    const response = chrome.tabs.sendMessage(tabId, {
      type: "TITLE_RULES_APPLY",
      url: changeInfo.url || tab.url || ""
    });

    if (response && typeof response.catch === "function") {
      response.catch(() => {
        // The tab may be a Chrome internal page or the content script may not be
        // ready yet. It is safe to ignore because the content script also reacts
        // to DOM and history changes on supported pages.
      });
    }
  }
});
