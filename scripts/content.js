(() => {
  "use strict";

  const { RULES_STORAGE_KEY, findMatchingRule, stripKnownRuleText, applyRuleToTitle, normalizeRules } = TitleRuleEngine;

  let rules = [];
  let activeRule = null;
  let lastAppliedTitle = "";
  let lastOriginalTitle = "";
  let isWritingTitle = false;

  async function loadRules() {
    const stored = await chrome.storage.local.get(RULES_STORAGE_KEY);
    rules = normalizeRules(stored[RULES_STORAGE_KEY] || TitleRulesDefaults.cloneRules());
  }

  function getCurrentUrl() {
    return window.location.href;
  }

  function getOriginalFromDocumentTitle() {
    const currentTitle = document.title || "";

    if (currentTitle === lastAppliedTitle && lastOriginalTitle) {
      return lastOriginalTitle;
    }

    return stripKnownRuleText(currentTitle, rules);
  }

  function applyTitleRules() {
    if (isWritingTitle) return;

    activeRule = findMatchingRule(rules, getCurrentUrl());
    const originalTitle = getOriginalFromDocumentTitle();
    const nextTitle = applyRuleToTitle(originalTitle, activeRule);

    lastOriginalTitle = originalTitle;
    lastAppliedTitle = nextTitle;

    if (document.title !== nextTitle) {
      isWritingTitle = true;
      document.title = nextTitle;
      queueMicrotask(() => {
        isWritingTitle = false;
      });
    }
  }

  function scheduleApply() {
    requestAnimationFrame(applyTitleRules);
  }

  function observeTitleElement() {
    const titleElement = document.querySelector("title");
    if (!titleElement) return;

    const observer = new MutationObserver(() => {
      if (!isWritingTitle) scheduleApply();
    });

    observer.observe(titleElement, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  function patchHistoryMethod(methodName) {
    const original = history[methodName];
    history[methodName] = function patchedHistoryMethod(...args) {
      const result = original.apply(this, args);
      window.dispatchEvent(new Event("title-rules-location-change"));
      return result;
    };
  }

  function listenForUrlChanges() {
    patchHistoryMethod("pushState");
    patchHistoryMethod("replaceState");
    window.addEventListener("popstate", scheduleApply);
    window.addEventListener("hashchange", scheduleApply);
    window.addEventListener("title-rules-location-change", scheduleApply);
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes[RULES_STORAGE_KEY]) {
      rules = normalizeRules(changes[RULES_STORAGE_KEY].newValue || []);
      lastAppliedTitle = "";
      lastOriginalTitle = "";
      scheduleApply();
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "TITLE_RULES_APPLY") {
      scheduleApply();
    }
  });

  async function init() {
    await loadRules();
    observeTitleElement();
    listenForUrlChanges();
    scheduleApply();

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        observeTitleElement();
        scheduleApply();
      }, { once: true });
    }
  }

  init();
})();
