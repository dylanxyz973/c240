(function () {
  function normalizeBase(value) {
    return String(value || '').trim().replace(/\/+$/, '');
  }

  function isLocalHost(hostname) {
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
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

  const currentHostname = typeof window.location !== 'undefined' && window.location.hostname
    ? window.location.hostname
    : '';

  const runningOnGithubPages = currentHostname.endsWith('github.io');
  const hasConfiguredApiBase = Boolean(configuredBase);

  const CLIENT_USERS_KEY = 'c240ClientUsers';

  function loadClientUsers() {
    try {
      const raw = localStorage.getItem(CLIENT_USERS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function saveClientUsers(users) {
    localStorage.setItem(CLIENT_USERS_KEY, JSON.stringify(users));
  }

  function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
  }

  function toFormDataObject(bodyText) {
    const params = new URLSearchParams(String(bodyText || ''));
    const result = {};

    params.forEach(function (value, key) {
      result[key] = value;
    });

    return result;
  }

  function jsonResponse(payload, statusCode) {
    return new Response(JSON.stringify(payload), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });
  }

  async function readRequestBody(input, init) {
    if (init && typeof init.body === 'string') {
      return init.body;
    }

    if (init && init.body instanceof URLSearchParams) {
      return init.body.toString();
    }

    if (input && typeof input.clone === 'function') {
      try {
        return await input.clone().text();
      } catch (error) {
        return '';
      }
    }

    return '';
  }

  async function handleClientSignup(input, init) {
    const body = toFormDataObject(await readRequestBody(input, init));
    const username = String(body.username || '').trim();
    const email = normalizeEmail(body.email);
    const password = String(body.password || '');
    const confirmPassword = String(body.confirmPassword || '');

    if (!username || !email || !password || !confirmPassword) {
      return jsonResponse({ success: false, message: 'Please fill in all fields.' }, 400);
    }

    if (password !== confirmPassword) {
      return jsonResponse({ success: false, message: 'Passwords do not match.' }, 400);
    }

    const users = loadClientUsers();
    const existing = users.find(function (user) {
      return normalizeEmail(user.email) === email;
    });

    if (existing) {
      return jsonResponse({ success: false, message: 'Email or username already exists.' }, 400);
    }

    users.push({ username: username, email: email, password: password });
    saveClientUsers(users);

    return jsonResponse({
      success: true,
      message: 'Your account has been created successfully.',
      username: username,
      email: email
    }, 200);
  }

  async function handleClientLogin(input, init) {
    const body = toFormDataObject(await readRequestBody(input, init));
    const email = normalizeEmail(body.email);
    const password = String(body.password || '');

    if (!email || !password) {
      return jsonResponse({ success: false, message: 'Please fill in all fields.' }, 400);
    }

    const users = loadClientUsers();
    const user = users.find(function (entry) {
      return normalizeEmail(entry.email) === email;
    });

    if (!user) {
      return jsonResponse({ success: false, message: 'This account and gmail does not exist, please try again.' }, 401);
    }

    if (String(user.password || '') !== password) {
      return jsonResponse({ success: false, message: 'Email or password is incorrect.' }, 401);
    }

    return jsonResponse({
      success: true,
      message: `Welcome back, ${user.username}!`,
      username: user.username
    }, 200);
  }

  const originalFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : null;

  if (runningOnGithubPages && originalFetch) {
    window.fetch = async function (input, init) {
      const requestUrl = typeof input === 'string'
        ? input
        : input && typeof input.url === 'string'
          ? input.url
          : '';

      if (requestUrl) {
        try {
          const resolvedUrl = new URL(requestUrl, window.location.href);
          const pathname = resolvedUrl.pathname.toLowerCase();
          const method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();

          if (!hasConfiguredApiBase && method === 'POST' && pathname.endsWith('/signup')) {
            return handleClientSignup(input, init);
          }

          if (!hasConfiguredApiBase && method === 'POST' && pathname.endsWith('/login')) {
            return handleClientLogin(input, init);
          }
        } catch (error) {
          // Fall back to the native fetch path if URL parsing fails.
        }
      }

      return originalFetch(input, init);
    };
  }

  function resolveBaseUrl() {
    if (hasConfiguredApiBase) {
      return configuredBase;
    }

    if (isLocalHost(currentHostname)) {
      return currentOrigin;
    }

    if (runningOnGithubPages) {
      return currentOrigin;
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
