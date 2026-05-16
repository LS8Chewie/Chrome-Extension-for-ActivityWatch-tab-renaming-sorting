(function exposeDefaultRules(globalScope) {
  "use strict";

  /**
   * Example starter rules. These are installed on first run and are also used by
   * the options page when the user chooses to restore examples.
   */
  const defaultRules = [
    {
      id: "example-youtube",
      enabled: true,
      name: "YouTube",
      domainPattern: "youtube.com",
      urlPattern: "",
      regexPattern: "",
      mode: "prepend",
      text: "[YT]"
    },
    {
      id: "example-school",
      enabled: false,
      name: "School site",
      domainPattern: "school.example.edu",
      urlPattern: "",
      regexPattern: "",
      mode: "append",
      text: "[School]"
    },
    {
      id: "example-writing",
      enabled: true,
      name: "Google Docs",
      domainPattern: "docs.google.com",
      urlPattern: "",
      regexPattern: "",
      mode: "prepend",
      text: "[Writing]"
    }
  ];

  globalScope.TitleRulesDefaults = {
    rules: defaultRules,
    cloneRules() {
      return defaultRules.map((rule) => ({ ...rule }));
    }
  };
})(globalThis);
