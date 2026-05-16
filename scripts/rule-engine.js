(function exposeRuleEngine(globalScope) {
  "use strict";

  const RULES_STORAGE_KEY = "titleRules";

  function normalizeRule(rule) {
    const legacyPattern = String(rule.pattern || "");
    const legacyMatchType = ["domain", "url", "regex"].includes(rule.matchType) ? rule.matchType : "domain";

    return {
      id: rule.id || crypto.randomUUID(),
      enabled: Boolean(rule.enabled),
      name: String(rule.name || "Untitled rule"),
      domainPattern: String(rule.domainPattern ?? (legacyMatchType === "domain" ? legacyPattern : "")),
      urlPattern: String(rule.urlPattern ?? (legacyMatchType === "url" ? legacyPattern : "")),
      regexPattern: String(rule.regexPattern ?? (legacyMatchType === "regex" ? legacyPattern : "")),
      mode: rule.mode === "append" ? "append" : "prepend",
      text: String(rule.text || "")
    };
  }

  function normalizeRules(rules) {
    return Array.isArray(rules) ? rules.map(normalizeRule) : [];
  }

  function getComparableUrl(url) {
    return String(url || "").trim();
  }

  function getHostname(url) {
    const candidateUrl = getComparableUrl(url);
    if (!candidateUrl) return "";

    try {
      return new URL(candidateUrl).hostname.toLowerCase();
    } catch (error) {
      try {
        return new URL(`https://${candidateUrl}`).hostname.toLowerCase();
      } catch (secondError) {
        return "";
      }
    }
  }

  function domainMatches(hostname, pattern) {
    const cleanedPattern = pattern.toLowerCase().trim().replace(/^https?:\/\//, "").split("/")[0];
    if (!cleanedPattern) return true;
    return hostname === cleanedPattern
      || hostname.endsWith(`.${cleanedPattern}`)
      || hostname.includes(cleanedPattern);
  }

  function urlContains(url, pattern) {
    const cleanedPattern = pattern.trim().toLowerCase();
    if (!cleanedPattern) return true;
    return getComparableUrl(url).toLowerCase().includes(cleanedPattern);
  }

  function regexMatches(url, pattern) {
    if (!pattern.trim()) return true;
    try {
      return new RegExp(pattern).test(getComparableUrl(url));
    } catch (error) {
      return false;
    }
  }

  function hasAnyMatcher(rule) {
    return Boolean(rule.domainPattern.trim() || rule.urlPattern.trim() || rule.regexPattern.trim());
  }

  function ruleMatchesUrl(rule, url) {
    if (!rule.enabled || !rule.text || !hasAnyMatcher(rule)) return false;

    const hostname = getHostname(url);
    return domainMatches(hostname, rule.domainPattern)
      && urlContains(url, rule.urlPattern)
      && regexMatches(url, rule.regexPattern);
  }

  function findMatchingRule(rules, url) {
    return normalizeRules(rules).find((rule) => ruleMatchesUrl(rule, url)) || null;
  }

  function hasPrefix(title, text) {
    return title === text || title.startsWith(`${text} `);
  }

  function hasSuffix(title, text) {
    return title === text || title.endsWith(` ${text}`);
  }

  function removeAffix(title, text, mode) {
    if (!text) return title;
    if (mode === "prepend") {
      if (title === text) return "";
      if (title.startsWith(`${text} `)) return title.slice(text.length + 1);
    }
    if (title === text) return "";
    if (title.endsWith(` ${text}`)) return title.slice(0, -(text.length + 1));
    return title;
  }

  function stripKnownRuleText(title, rules) {
    return normalizeRules(rules).reduce(
      (currentTitle, rule) => removeAffix(currentTitle, rule.text, rule.mode),
      title
    );
  }

  function applyRuleToTitle(originalTitle, rule) {
    if (!rule || !rule.text) return originalTitle;
    const safeOriginalTitle = removeAffix(originalTitle, rule.text, rule.mode).trim();

    if (rule.mode === "append") {
      if (hasSuffix(safeOriginalTitle, rule.text)) return safeOriginalTitle;
      return `${safeOriginalTitle} ${rule.text}`.trim();
    }

    if (hasPrefix(safeOriginalTitle, rule.text)) return safeOriginalTitle;
    return `${rule.text} ${safeOriginalTitle}`.trim();
  }

  function buildPreview(title, url, rules) {
    const matchingRule = findMatchingRule(rules, url);
    const originalTitle = stripKnownRuleText(title, rules);
    return applyRuleToTitle(originalTitle, matchingRule);
  }

  globalScope.TitleRuleEngine = {
    RULES_STORAGE_KEY,
    normalizeRule,
    normalizeRules,
    findMatchingRule,
    stripKnownRuleText,
    applyRuleToTitle,
    buildPreview
  };
})(globalThis);
