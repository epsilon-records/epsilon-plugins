// Manual public-site beacon only, same approach as epsilon-web's analytics.js (shared decision 0011).
// Cloudflare Web Analytics: no cookies, no browser storage, no custom events.
(() => {
  "use strict";
  try {
    // Public client identifier, NOT an API credential: the Cloudflare Web Analytics site token for
    // plugins.epsilonrecords.com. Empty string disables all vendor requests.
    const token = "95559ccd697549abad0804993d521dbe";
    if (!/^[a-f0-9]{32}$/i.test(token || "")) return;

    // Explicit public content routes, not a prefix rule. Review additions for URL exposure.
    const paths = new Set(["/", "/install", "/made"]);
    // Referrers are only counted when they are a known public page on either site (or none).
    const referrerPaths = new Set([...paths, "/about/", "/contact/", "/erms/", "/audiokit/", "/epsilon-audio/",
      "/nieuwe-groove-collectief/", "/diverse-records/", "/collective/", "/partners/", "/anr-guide/"]);
    const clean = (raw, allowed, origin) => {
      if (typeof raw !== "string" || !raw || /[?#]/.test(raw)) return false;
      const url = new URL(raw);
      if (url.protocol !== "https:" || url.username || url.password) return false;
      if (!allowed.has(url.pathname)) return false;
      return !origin || url.origin === origin;
    };
    if (!clean(location.href, paths, "https://plugins.epsilonrecords.com")) return;
    const navigation = performance.getEntriesByType("navigation");
    if (navigation.length !== 1 || !clean(navigation[0].name, paths, "https://plugins.epsilonrecords.com")) return;
    if (typeof document.referrer !== "string") return;
    if (document.referrer !== "" && !clean(document.referrer, referrerPaths)) return;
    if (window.__epsilonAnalyticsInstalled || document.querySelector(
      'script[data-cf-beacon], script[src*="cloudflareinsights.com/"]',
    )) return;

    const beacon = document.createElement("script");
    beacon.src = "https://static.cloudflareinsights.com/beacon.min.js";
    beacon.defer = true;
    beacon.referrerPolicy = "no-referrer";
    beacon.setAttribute("data-cf-beacon", JSON.stringify({ token, spa: false }));
    window.__epsilonAnalyticsInstalled = true;
    document.head.append(beacon);
  } catch {
    // Missing/unknown browser context must never enable collection.
  }
})();
