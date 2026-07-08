(function () {
  function normalizeBase(value) {
    return String(value || '').trim().replace(/\/+$/, '');
  }

  function readApiBaseFromQuery() {
    if (typeof window.location === 'undefined' || !window.location.search) {
      return '';
    }

    const params = new URLSearchParams(window.location.search);
    const value = normalizeBase(params.get('apiBaseUrl') || params.get('api') || '');
    return value;
  }

  function isLocalHost(hostname) {
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  }

  const queryBase = readApiBaseFromQuery();

  if (queryBase) {
    localStorage.setItem('apiBaseUrl', queryBase);
  }

  const configuredBase = normalizeBase(
    queryBase ||
    window.__API_BASE_URL ||
    window.API_BASE_URL ||
    localStorage.getItem('apiBaseUrl') ||
    ''
  );

  const currentOrigin = typeof window.location !== 'undefined' && window.location.origin
    ? window.location.origin
    : '';

  const currentHostname = typeof window.location !== 'undefined' && window.location.hostname
    ? window.location.hostname
    : '';

  const runningOnGithubPages = currentHostname.endsWith('github.io');
  const hasConfiguredApiBase = Boolean(configuredBase);

  function resolveBaseUrl() {
    if (hasConfiguredApiBase) {
      return configuredBase;
    }

    if (isLocalHost(currentHostname)) {
      return currentOrigin;
    }

    if (runningOnGithubPages) {
      // GitHub Pages cannot host this Node backend; use configured API base when available.
      return '';
    }

    return currentOrigin;
  }

  function getApiUrl(endpoint) {
    if (!endpoint) {
      return endpoint;
    }

    const path = String(endpoint).startsWith('/') ? endpoint : `/${endpoint}`;
    const base = resolveBaseUrl();

    if (base) {
      return `${base}${path}`;
    }

    return '';
  }

  window.getApiUrl = getApiUrl;
})();
