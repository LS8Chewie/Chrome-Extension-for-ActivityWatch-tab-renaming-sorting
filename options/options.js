(() => {
  "use strict";

  const { RULES_STORAGE_KEY, normalizeRule, normalizeRules, buildPreview } = TitleRuleEngine;
  const THEME_STORAGE_KEY = "optionsTheme";

  const rulesList = document.querySelector("#rulesList");
  const ruleTemplate = document.querySelector("#ruleTemplate");
  const addRuleButton = document.querySelector("#addRuleButton");
  const exportButton = document.querySelector("#exportButton");
  const importInput = document.querySelector("#importInput");
  const restoreDefaultsButton = document.querySelector("#restoreDefaultsButton");
  const addPreviewRuleButton = document.querySelector("#addPreviewRuleButton");
  const darkModeToggle = document.querySelector("#darkModeToggle");
  const previewTitle = document.querySelector("#previewTitle");
  const previewUrl = document.querySelector("#previewUrl");
  const previewOutput = document.querySelector("#previewOutput");
  const statusMessage = document.querySelector("#statusMessage");

  let rules = [];
  let saveTimer = null;

  function setStatus(message) {
    statusMessage.textContent = message;
    window.clearTimeout(setStatus.timer);
    setStatus.timer = window.setTimeout(() => {
      statusMessage.textContent = "";
    }, 2400);
  }

  function applyTheme(theme) {
    const normalizedTheme = theme === "dark" ? "dark" : "light";
    document.body.dataset.theme = normalizedTheme;
    darkModeToggle.checked = normalizedTheme === "dark";
  }

  async function loadTheme() {
    const stored = await chrome.storage.local.get(THEME_STORAGE_KEY);
    applyTheme(stored[THEME_STORAGE_KEY]);
  }

  async function saveTheme(theme) {
    applyTheme(theme);
    await chrome.storage.local.set({ [THEME_STORAGE_KEY]: theme });
  }

  function createBlankRule() {
    return normalizeRule({
      id: crypto.randomUUID(),
      enabled: true,
      name: "New rule",
      domainPattern: "example.com",
      urlPattern: "",
      regexPattern: "",
      mode: "prepend",
      text: "[Tag]"
    });
  }

  function getHostnameFromInput(value) {
    const trimmedValue = value.trim();
    if (!trimmedValue) return "";

    try {
      return new URL(trimmedValue).hostname.toLowerCase();
    } catch (error) {
      try {
        return new URL(`https://${trimmedValue}`).hostname.toLowerCase();
      } catch (secondError) {
        return "";
      }
    }
  }

  function getRuleNameFromHostname(hostname) {
    return hostname
      .replace(/^www\./, "")
      .split(".")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ") || "New site";
  }

  function createRuleFromPreviewUrl() {
    const hostname = getHostnameFromInput(previewUrl.value);
    if (!hostname) {
      setStatus("Enter a valid URL or domain first.");
      previewUrl.focus();
      return null;
    }

    const ruleName = getRuleNameFromHostname(hostname);
    return normalizeRule({
      id: crypto.randomUUID(),
      enabled: true,
      name: ruleName,
      domainPattern: hostname.replace(/^www\./, ""),
      urlPattern: "",
      regexPattern: "",
      mode: "prepend",
      text: `[${ruleName}]`
    });
  }

  async function saveRules() {
    await chrome.storage.local.set({ [RULES_STORAGE_KEY]: normalizeRules(rules) });
    setStatus("Rules saved locally.");
  }

  function scheduleSave() {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveRules, 250);
    renderPreview();
  }

  function updateRule(ruleId, patch) {
    rules = rules.map((rule) => (rule.id === ruleId ? normalizeRule({ ...rule, ...patch }) : rule));
    scheduleSave();
  }

  function renderPreview() {
    previewOutput.value = buildPreview(previewTitle.value, previewUrl.value, rules);
    previewOutput.textContent = previewOutput.value || "No matching rule — title stays unchanged.";
  }

  function renderRules() {
    rulesList.textContent = "";

    if (!rules.length) {
      const emptyState = document.createElement("div");
      emptyState.className = "empty-state";
      emptyState.textContent = "No rules yet. Add a rule to start labeling tab titles.";
      rulesList.append(emptyState);
      renderPreview();
      return;
    }

    rules.forEach((rule) => {
      const fragment = ruleTemplate.content.cloneNode(true);
      const card = fragment.querySelector(".rule-card");
      const enabled = fragment.querySelector(".rule-enabled");
      const name = fragment.querySelector(".rule-name");
      const domainPattern = fragment.querySelector(".rule-domain-pattern");
      const urlPattern = fragment.querySelector(".rule-url-pattern");
      const regexPattern = fragment.querySelector(".rule-regex-pattern");
      const mode = fragment.querySelector(".rule-mode");
      const text = fragment.querySelector(".rule-text");
      const removeButton = fragment.querySelector(".remove-rule");

      card.dataset.ruleId = rule.id;
      enabled.checked = rule.enabled;
      name.value = rule.name;
      domainPattern.value = rule.domainPattern;
      urlPattern.value = rule.urlPattern;
      regexPattern.value = rule.regexPattern;
      mode.value = rule.mode;
      text.value = rule.text;

      enabled.addEventListener("change", () => updateRule(rule.id, { enabled: enabled.checked }));
      name.addEventListener("input", () => updateRule(rule.id, { name: name.value }));
      domainPattern.addEventListener("input", () => updateRule(rule.id, { domainPattern: domainPattern.value }));
      urlPattern.addEventListener("input", () => updateRule(rule.id, { urlPattern: urlPattern.value }));
      regexPattern.addEventListener("input", () => updateRule(rule.id, { regexPattern: regexPattern.value }));
      mode.addEventListener("change", () => updateRule(rule.id, { mode: mode.value }));
      text.addEventListener("input", () => updateRule(rule.id, { text: text.value }));
      removeButton.addEventListener("click", () => {
        rules = rules.filter((candidate) => candidate.id !== rule.id);
        renderRules();
        saveRules();
      });

      rulesList.append(fragment);
    });

    renderPreview();
  }

  async function loadRules() {
    const stored = await chrome.storage.local.get(RULES_STORAGE_KEY);
    rules = normalizeRules(stored[RULES_STORAGE_KEY] || TitleRulesDefaults.cloneRules());
    renderRules();
  }

  function downloadJson(filename, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importRules(file) {
    if (!file) return;

    try {
      const imported = JSON.parse(await file.text());
      const importedRules = Array.isArray(imported) ? imported : imported.rules;
      if (!Array.isArray(importedRules)) {
        throw new Error("JSON must be an array of rules or an object with a rules array.");
      }

      rules = normalizeRules(importedRules);
      renderRules();
      await saveRules();
      setStatus(`Imported ${rules.length} rules.`);
    } catch (error) {
      setStatus(`Import failed: ${error.message}`);
    } finally {
      importInput.value = "";
    }
  }

  addRuleButton.addEventListener("click", () => {
    rules = [...rules, createBlankRule()];
    renderRules();
    saveRules();
  });

  addPreviewRuleButton.addEventListener("click", async () => {
    const previewRule = createRuleFromPreviewUrl();
    if (!previewRule) return;

    rules = [...rules, previewRule];
    renderRules();
    await saveRules();
    setStatus(`Added a rule for ${previewRule.domainPattern}.`);
  });

  exportButton.addEventListener("click", () => {
    downloadJson("activitywatch-title-rules.json", { rules: normalizeRules(rules) });
    setStatus("Exported rules as JSON.");
  });

  importInput.addEventListener("change", () => importRules(importInput.files[0]));

  restoreDefaultsButton.addEventListener("click", async () => {
    rules = TitleRulesDefaults.cloneRules();
    renderRules();
    await saveRules();
    setStatus("Example rules restored.");
  });

  darkModeToggle.addEventListener("change", () => {
    saveTheme(darkModeToggle.checked ? "dark" : "light");
  });
  previewTitle.addEventListener("input", renderPreview);
  previewUrl.addEventListener("input", renderPreview);

  loadTheme();
  loadRules();
})();
