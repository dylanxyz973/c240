(function () {
  function normalizeBase(value) {
    return String(value || '').trim().replace(/\/+$/, '');
  }

  const configuredBase = normalizeBase(
    window.__API_BASE_URL ||
    window.API_BASE_URL ||
    localStorage.getItem('apiBaseUrl') ||
    ''
  );

  const currentOrigin = typeof window.location !== 'undefined' && window.location.origin
    ? window.location.origin
    : '';

  function getApiUrl(endpoint) {
    if (!endpoint) {
      return endpoint;
    }

    const path = String(endpoint).startsWith('/') ? endpoint : `/${endpoint}`;

    if (configuredBase) {
      return `${configuredBase}${path}`;
    }

    if (currentOrigin) {
      return `${currentOrigin}${path}`;
    }

    return path;
  }

  window.getApiUrl = getApiUrl;
})();
