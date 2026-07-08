const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { exec } = require('child_process');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const { parse } = require('querystring');

const frontendDir = path.join(__dirname, '..', 'frontend');

const usersDbFile = path.join(__dirname, 'users.json');
const messagesDbFile = path.join(__dirname, 'messages.json');

// MySQL connection pool
// Read DB config from environment variables when possible
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'c240user',
  password: process.env.DB_PASS || process.env.MYSQL_PASSWORD || 'C240pass123!',
  database: process.env.DB_NAME || 'authentication_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool = mysql.createPool(dbConfig);
let useFileDatabase = false;

function loadUsersFile() {
  if (!fs.existsSync(usersDbFile)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(usersDbFile, 'utf8');
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('[DB] failed to read users.json:', err);
    return [];
  }
}

function saveUsersFile(users) {
  try {
    fs.writeFileSync(usersDbFile, JSON.stringify(users, null, 2), 'utf8');
  } catch (err) {
    console.error('[DB] failed to write users.json:', err);
  }
}

function loadMessagesFile() {
  if (!fs.existsSync(messagesDbFile)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(messagesDbFile, 'utf8');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('[DB] failed to read messages.json:', err);
    return [];
  }
}

function saveMessagesFile(messages) {
  try {
    fs.writeFileSync(messagesDbFile, JSON.stringify(messages, null, 2), 'utf8');
  } catch (err) {
    console.error('[DB] failed to write messages.json:', err);
  }
}

async function testMySqlConnection() {
  try {
    const [rows] = await pool.promise().query('SELECT 1');
    console.log('[DB] MySQL connection available');
    return true;
  } catch (err) {
    console.error('[DB] MySQL unavailable, falling back to local JSON storage:', err.code || err.message);
    useFileDatabase = true;
    if (!fs.existsSync(usersDbFile)) {
      saveUsersFile([]);
    }
    return false;
  }
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function mergeUsersForFile(mysqlUsers, fileUsers) {
  const byEmail = new Map();

  for (const user of Array.isArray(mysqlUsers) ? mysqlUsers : []) {
    const email = normalizeEmail(user.email);
    if (!email) {
      continue;
    }

    byEmail.set(email, {
      id: user.id,
      username: String(user.username || '').trim(),
      name: String(user.username || '').trim(),
      interests: [],
      email,
      password: user.password,
      created_at: user.created_at ? new Date(user.created_at).toISOString() : new Date().toISOString()
    });
  }

  for (const fileUser of Array.isArray(fileUsers) ? fileUsers : []) {
    const email = normalizeEmail(fileUser.email);
    if (!email) {
      continue;
    }

    const existing = byEmail.get(email);
    if (existing) {
      byEmail.set(email, {
        ...existing,
        name: String(fileUser.name || existing.name || existing.username || '').trim(),
        interests: Array.isArray(fileUser.interests) ? fileUser.interests : existing.interests
      });
      continue;
    }

    byEmail.set(email, {
      id: fileUser.id,
      username: String(fileUser.username || email.split('@')[0] || '').trim(),
      name: String(fileUser.name || fileUser.username || email.split('@')[0] || '').trim(),
      interests: Array.isArray(fileUser.interests) ? fileUser.interests : [],
      email,
      password: fileUser.password,
      created_at: fileUser.created_at || new Date().toISOString()
    });
  }

  return Array.from(byEmail.values());
}

async function synchronizeUsersAcrossStores() {
  if (useFileDatabase) {
    return;
  }

  await executeQuery(
    `CREATE TABLE IF NOT EXISTS users (
      id INT NOT NULL AUTO_INCREMENT,
      username VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    []
  );

  if (useFileDatabase) {
    return;
  }

  const usersFromFile = loadUsersFile();
  for (const user of usersFromFile) {
    const username = String(user.username || '').trim();
    const email = normalizeEmail(user.email);
    const password = String(user.password || '').trim();
    if (!username || !email || !password) {
      continue;
    }

    await executeQuery(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE username = VALUES(username), password = VALUES(password)',
      [username, email, password]
    );

    if (useFileDatabase) {
      return;
    }
  }

  const usersFromMySql = await executeQuery('SELECT id, username, email, password, created_at FROM users', []);
  if (usersFromMySql === null) {
    return;
  }

  const mergedUsers = mergeUsersForFile(usersFromMySql, usersFromFile);
  saveUsersFile(mergedUsers);
}

async function executeQuery(query, params) {
  if (useFileDatabase) {
    return null;
  }
  try {
    const [rows] = await pool.promise().query(query, params);
    return rows;
  } catch (err) {
    console.error('[DB] query error, switching to local JSON storage:', err.code || err.message);
    useFileDatabase = true;
    if (!fs.existsSync(usersDbFile)) {
      saveUsersFile([]);
    }
    return null;
  }
}

async function findUsersByEmailOrUsername(email, username) {
  if (useFileDatabase) {
    const users = loadUsersFile();
    return users.filter((user) => normalizeEmail(user.email) === normalizeEmail(email) || String(user.username || '').trim() === String(username || '').trim());
  }
  const rows = await executeQuery('SELECT * FROM users WHERE email = ? OR username = ?', [email, username]);
  if (rows === null) {
    const users = loadUsersFile();
    return users.filter((user) => normalizeEmail(user.email) === normalizeEmail(email) || String(user.username || '').trim() === String(username || '').trim());
  }
  return rows;
}

async function findUserByEmail(email) {
  if (useFileDatabase) {
    const users = loadUsersFile();
    return users.find((user) => normalizeEmail(user.email) === normalizeEmail(email)) || null;
  }
  const rows = await executeQuery('SELECT * FROM users WHERE email = ?', [email]);
  if (rows === null) {
    const users = loadUsersFile();
    return users.find((user) => normalizeEmail(user.email) === normalizeEmail(email)) || null;
  }

  if (rows[0]) {
    return rows[0];
  }

  const users = loadUsersFile();
  return users.find((user) => normalizeEmail(user.email) === normalizeEmail(email)) || null;
}

async function insertUser(username, email, passwordHash) {
  if (useFileDatabase) {
    const users = loadUsersFile();
    const nextId = users.length > 0 ? Math.max(...users.map((u) => u.id || 0)) + 1 : 1;
    users.push({ id: nextId, username, name: username, interests: [], email: normalizeEmail(email), password: passwordHash, created_at: new Date().toISOString() });
    saveUsersFile(users);
    return;
  }

  const rows = await executeQuery('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, passwordHash]);
  const users = loadUsersFile();
  const normalizedEmail = normalizeEmail(email);
  const existingIndex = users.findIndex((user) => normalizeEmail(user.email) === normalizedEmail);

  if (existingIndex >= 0) {
    users[existingIndex] = {
      ...users[existingIndex],
      username,
      name: String(users[existingIndex].name || username || '').trim(),
      email: normalizedEmail,
      password: passwordHash
    };
  } else {
    const nextId = users.length > 0 ? Math.max(...users.map((u) => u.id || 0)) + 1 : 1;
    users.push({ id: nextId, username, name: username, interests: [], email: normalizedEmail, password: passwordHash, created_at: new Date().toISOString() });
  }

  saveUsersFile(users);

  if (rows === null) {
    return;
  }
}

function toPublicUser(user) {
  const username = String(user.username || user.email || '').trim();
  const name = String(user.name || username || '').trim();
  const interests = Array.isArray(user.interests)
    ? user.interests.map((x) => String(x).trim()).filter(Boolean)
    : String(user.interests || '')
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);

  return {
    id: user.id,
    username,
    name,
    interests,
    email: user.email || ''
  };
}

function normalizeSearchValue(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeChatHandle(value) {
  return normalizeSearchValue(value).replace(/^@+/, '');
}

function buildConversationId(userA, userB) {
  const a = normalizeChatHandle(userA);
  const b = normalizeChatHandle(userB);
  return [a, b].sort().join('::');
}

function listConversationMessages(userA, userB) {
  const conversationId = buildConversationId(userA, userB);
  return loadMessagesFile()
    .filter((message) => message.conversation_id === conversationId)
    .sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime())
    .map((message) => ({
      id: message.id,
      from: message.from,
      to: message.to,
      text: message.text,
      created_at: message.created_at
    }));
}

function storeMessage(from, to, text) {
  const fromHandle = normalizeChatHandle(from);
  const toHandle = normalizeChatHandle(to);
  const cleanText = String(text || '').trim();
  if (!fromHandle || !toHandle || !cleanText) {
    return null;
  }

  const messages = loadMessagesFile();
  const nextId = messages.length > 0 ? Math.max(...messages.map((m) => Number(m.id) || 0)) + 1 : 1;
  const createdAt = new Date().toISOString();

  const message = {
    id: nextId,
    from: fromHandle,
    to: toHandle,
    text: cleanText,
    conversation_id: buildConversationId(fromHandle, toHandle),
    created_at: createdAt
  };

  messages.push(message);
  saveMessagesFile(messages);
  return message;
}

function deleteLastMessageBySender(from, to) {
  const fromHandle = normalizeChatHandle(from);
  const toHandle = normalizeChatHandle(to);
  if (!fromHandle || !toHandle) {
    return false;
  }

  const conversationId = buildConversationId(fromHandle, toHandle);
  const messages = loadMessagesFile();
  let targetIndex = -1;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.conversation_id === conversationId && normalizeChatHandle(message.from) === fromHandle) {
      targetIndex = index;
      break;
    }
  }

  if (targetIndex < 0) {
    return false;
  }

  messages.splice(targetIndex, 1);
  saveMessagesFile(messages);
  return true;
}

function deleteMessageById(userA, userB, messageId) {
  const conversationId = buildConversationId(userA, userB);
  const targetId = Number(messageId);
  if (!Number.isFinite(targetId)) {
    return false;
  }

  const messages = loadMessagesFile();
  const targetIndex = messages.findIndex((message) =>
    Number(message.id) === targetId && message.conversation_id === conversationId
  );

  if (targetIndex < 0) {
    return false;
  }

  messages.splice(targetIndex, 1);
  saveMessagesFile(messages);
  return true;
}

function clearConversationMessages(userA, userB) {
  const conversationId = buildConversationId(userA, userB);
  const messages = loadMessagesFile();
  const nextMessages = messages.filter((message) => message.conversation_id !== conversationId);

  if (nextMessages.length === messages.length) {
    return 0;
  }

  saveMessagesFile(nextMessages);
  return messages.length - nextMessages.length;
}

function deleteMessagesByHandles(handles) {
  const normalizedHandles = Array.isArray(handles)
    ? handles.map((h) => normalizeChatHandle(h)).filter(Boolean)
    : [];

  if (normalizedHandles.length === 0) {
    return 0;
  }

  const set = new Set(normalizedHandles);
  const messages = loadMessagesFile();
  const nextMessages = messages.filter((message) => {
    return !set.has(normalizeChatHandle(message.from)) && !set.has(normalizeChatHandle(message.to));
  });

  if (nextMessages.length === messages.length) {
    return 0;
  }

  saveMessagesFile(nextMessages);
  return messages.length - nextMessages.length;
}

function filterPublicUsers(users, usernameQuery, excludeEmail) {
  const query = normalizeSearchValue(usernameQuery).replace(/^@+/, '');
  const exclude = normalizeSearchValue(excludeEmail);

  return users
    .map(toPublicUser)
    .filter((user) => {
      if (exclude && normalizeSearchValue(user.email) === exclude) {
        return false;
      }

      if (!query) {
        return true;
      }

      const username = normalizeSearchValue(user.username);
      const name = normalizeSearchValue(user.name);
      const email = normalizeSearchValue(user.email);
      const emailHandle = email.includes('@') ? email.split('@')[0] : email;

      return username.includes(query) || name.includes(query) || emailHandle.includes(query);
    });
}

async function listPublicUsers(usernameQuery, excludeEmail) {
  if (useFileDatabase) {
    return filterPublicUsers(loadUsersFile(), usernameQuery, excludeEmail);
  }

  const rows = await executeQuery('SELECT id, username, email FROM users', []);
  if (rows === null) {
    return filterPublicUsers(loadUsersFile(), usernameQuery, excludeEmail);
  }

  return filterPublicUsers(rows, usernameQuery, excludeEmail);
}

async function updateUserPublicProfile(email, name, interests) {
  const normalizedEmail = normalizeSearchValue(email);
  if (!normalizedEmail) {
    return false;
  }

  const users = loadUsersFile();
  let updated = false;
  const nextUsers = users.map((user) => {
    if (normalizeSearchValue(user.email) !== normalizedEmail) {
      return user;
    }
    updated = true;
    return {
      ...user,
      name: String(name || user.name || user.username || '').trim(),
      interests: Array.isArray(interests) ? interests : []
    };
  });

  if (updated) {
    saveUsersFile(nextUsers);
  }

  return updated;
}

async function deleteUserByIdentity(emailOrUsername) {
  const normalizedIdentity = normalizeSearchValue(emailOrUsername);
  if (!normalizedIdentity) {
    return { deleted: false, handles: [], removedMessages: 0 };
  }

  const users = loadUsersFile();
  const targetUser = users.find((user) => {
    const email = normalizeSearchValue(user.email);
    const username = normalizeSearchValue(user.username);
    return email === normalizedIdentity || username === normalizedIdentity;
  });

  const handles = [];
  if (targetUser) {
    const emailHandle = String(targetUser.email || '').split('@')[0];
    handles.push(emailHandle, targetUser.username, targetUser.name, targetUser.email);
  } else {
    const guessedHandle = normalizedIdentity.includes('@') ? normalizedIdentity.split('@')[0] : normalizedIdentity;
    handles.push(guessedHandle, normalizedIdentity);
  }

  const nextUsers = users.filter((user) => {
    const email = normalizeSearchValue(user.email);
    const username = normalizeSearchValue(user.username);
    return email !== normalizedIdentity && username !== normalizedIdentity;
  });

  const removedInFile = nextUsers.length !== users.length;
  if (removedInFile) {
    saveUsersFile(nextUsers);
  }

  let removedInMySql = false;
  if (!useFileDatabase) {
    try {
      const result = await executeQuery('DELETE FROM users WHERE email = ? OR username = ?', [normalizedIdentity, normalizedIdentity]);
      if (result && typeof result.affectedRows === 'number' && result.affectedRows > 0) {
        removedInMySql = true;
      }
    } catch (error) {
      console.error('[ACCOUNT DELETE] mysql delete warning:', error);
    }
  }

  const removedMessages = deleteMessagesByHandles(handles);
  return { deleted: removedInFile || removedInMySql, handles, removedMessages };
}

async function updateUserPasswordByEmail(email, passwordHash) {
  if (useFileDatabase) {
    const users = loadUsersFile();
    const updated = users.map((user) => {
      if (user.email === email) {
        return { ...user, password: passwordHash };
      }
      return user;
    });
    saveUsersFile(updated);
    return;
  }

  const rows = await executeQuery('UPDATE users SET password = ? WHERE email = ?', [passwordHash, email]);
  const users = loadUsersFile();
  const updated = users.map((user) => {
    if (normalizeEmail(user.email) === normalizeEmail(email)) {
      return { ...user, password: passwordHash };
    }
    return user;
  });
  saveUsersFile(updated);

  if (rows === null) {
    return;
  }
}


function sendHtml(res, html, statusCode = 200) {
  res.writeHead(statusCode, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function sendJson(res, data, statusCode = 200) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };

  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendHtml(res, '<h1>File not found</h1>', 404);
      return;
    }

    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function renderMessage(title, message, linkText, linkHref) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <link rel="stylesheet" href="/styling.css" />
</head>
<body>
  <main class="content-card">
    <h1>${title}</h1>
    <p>${message}</p>
    <p><a href="${linkHref}">${linkText}</a></p>
  </main>
</body>
</html>`;
}

function parseBody(req, callback) {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', () => {
    const parsed = parse(body);
    console.log('[server] parsed body ->', parsed);
    callback(parsed);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  console.log(`[${new Date().toISOString()}] ${req.method} ${pathname} from ${req.socket.remoteAddress}`);

  // Add CORS headers so frontend served from another origin (e.g., Live Server) can POST/GET
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && pathname === '/') {
    sendFile(res, path.join(frontendDir, 'login.html'));
    return;
  }

  if (req.method === 'GET' && pathname === '/login') {
    sendFile(res, path.join(frontendDir, 'login.html'));
    return;
  }

  if (req.method === 'GET' && pathname === '/signup') {
    sendFile(res, path.join(frontendDir, 'signup.html'));
    return;
  }

  if (req.method === 'GET' && pathname === '/forgot-password') {
    sendFile(res, path.join(frontendDir, 'forgot-password.html'));
    return;
  }

  if (req.method === 'POST' && pathname === '/signup') {
    parseBody(req, async (body) => {
      const { username, email, password, confirmPassword } = body;

      if (!username || !email || !password || !confirmPassword) {
        sendJson(res, { success: false, message: 'Please fill in all fields.' }, 400);
        return;
      }

      if (password !== confirmPassword) {
        sendJson(res, { success: false, message: 'Passwords do not match.' }, 400);
        return;
      }

      try {
        const existing = await findUsersByEmailOrUsername(email, username);
        console.log('[DB] existing users count:', Array.isArray(existing) ? existing.length : 0);

        if (existing.length > 0) {
          sendJson(res, { success: false, message: 'Email or username already exists.' }, 400);
          return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await insertUser(username, email, hashedPassword);
        console.log('[DB] user created:', email);
        sendJson(res, {
          success: true,
          message: 'Your account has been created successfully.',
          username: String(username || '').trim(),
          email: normalizeEmail(email)
        });
      } catch (error) {
        console.error('[SIGNUP] error:', error);
        sendJson(res, { success: false, message: 'An error occurred.' }, 500);
      }
    });
    return;
  }

  if (req.method === 'POST' && pathname === '/login') {
    parseBody(req, async (body) => {
      const { email, password } = body;

      try {
        const user = await findUserByEmail(email);
        if (!user) {
          sendJson(res, { success: false, message: 'This account and gmail does not exist, please try again.' }, 401);
          return;
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
          sendJson(res, { success: false, message: 'Email or password is incorrect.' }, 401);
          return;
        }

        sendJson(res, { success: true, message: `Welcome back, ${user.username}!`, username: user.username });
      } catch (error) {
        console.error('[LOGIN] error:', error);
        sendJson(res, { success: false, message: 'An error occurred.' }, 500);
      }
    });
    return;
  }

  if (req.method === 'POST' && pathname === '/forgot-password') {
    parseBody(req, async (body) => {
      const { email, newPassword, confirmPassword } = body;

      if (!email || !newPassword || !confirmPassword) {
        sendJson(res, { success: false, message: 'Please fill in all fields.' }, 400);
        return;
      }

      if (newPassword !== confirmPassword) {
        sendJson(res, { success: false, message: 'Passwords do not match.' }, 400);
        return;
      }

      try {
        const user = await findUserByEmail(email);
        if (!user) {
          sendJson(res, { success: false, message: 'No account was found with that email.' }, 404);
          return;
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await updateUserPasswordByEmail(email, hashedPassword);
        sendJson(res, { success: true, message: 'Your password has been updated.' });
      } catch (error) {
        console.error('[FORGOT PASSWORD] error:', error);
        sendJson(res, { success: false, message: 'An error occurred.' }, 500);
      }
    });
    return;
  }

  // Change password while knowing current password (for logged-in users)
  if (req.method === 'POST' && pathname === '/change-password') {
    parseBody(req, async (body) => {
      const { email, currentPassword, newPassword, confirmPassword } = body;

      if (!email || !currentPassword || !newPassword || !confirmPassword) {
        sendJson(res, { success: false, message: 'Please fill in all fields.' }, 400);
        return;
      }

      if (newPassword !== confirmPassword) {
        sendJson(res, { success: false, message: 'New passwords do not match.' }, 400);
        return;
      }

      try {
        const user = await findUserByEmail(email);
        if (!user) {
          sendJson(res, { success: false, message: 'No account was found with that email.' }, 404);
          return;
        }

        const passwordMatch = await bcrypt.compare(currentPassword, user.password);
        if (!passwordMatch) {
          sendJson(res, { success: false, message: 'Current password is incorrect.' }, 401);
          return;
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await updateUserPasswordByEmail(email, hashedPassword);
        sendJson(res, { success: true, message: 'Your password has been updated.' });
      } catch (error) {
        console.error('[CHANGE PASSWORD] error:', error);
        sendJson(res, { success: false, message: 'An error occurred.' }, 500);
      }
    });
    return;
  }

  if (req.method === 'GET' && pathname === '/users/search') {
    const usernameQuery = url.searchParams.get('username') || '';
    const excludeEmail = url.searchParams.get('excludeEmail') || '';

    try {
      const users = await listPublicUsers(usernameQuery, excludeEmail);
      sendJson(res, { success: true, users });
    } catch (error) {
      console.error('[USERS SEARCH] error:', error);
      sendJson(res, { success: false, message: 'Unable to search users right now.' }, 500);
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/profile') {
    parseBody(req, async (body) => {
      const email = String(body.email || '').trim();
      const name = String(body.name || '').trim();
      const interestsRaw = String(body.interests || '').trim();
      const interests = interestsRaw
        ? interestsRaw.split(',').map((x) => x.trim()).filter(Boolean)
        : [];

      if (!email) {
        sendJson(res, { success: false, message: 'Email is required.' }, 400);
        return;
      }

      try {
        const updated = await updateUserPublicProfile(email, name, interests);
        if (!updated) {
          sendJson(res, { success: false, message: 'No matching user found.' }, 404);
          return;
        }

        sendJson(res, { success: true, message: 'Profile updated.' });
      } catch (error) {
        console.error('[PROFILE UPDATE] error:', error);
        sendJson(res, { success: false, message: 'Unable to update profile.' }, 500);
      }
    });
    return;
  }

  if (req.method === 'POST' && pathname === '/account/delete') {
    parseBody(req, async (body) => {
      const email = String(body.email || '').trim().toLowerCase();
      const username = String(body.username || '').trim().toLowerCase();
      const identity = email || username;

      if (!identity) {
        sendJson(res, { success: false, message: 'Email or username is required.' }, 400);
        return;
      }

      try {
        const result = await deleteUserByIdentity(identity);
        if (!result.deleted) {
          sendJson(res, { success: false, message: 'Account not found.' }, 404);
          return;
        }

        sendJson(res, {
          success: true,
          message: 'Account deleted successfully.',
          removedMessages: result.removedMessages || 0
        });
      } catch (error) {
        console.error('[ACCOUNT DELETE] error:', error);
        sendJson(res, { success: false, message: 'Unable to delete account.' }, 500);
      }
    });
    return;
  }

  if (req.method === 'GET' && pathname === '/messages') {
    const from = String(url.searchParams.get('from') || '').trim();
    const to = String(url.searchParams.get('to') || '').trim();

    if (!from || !to) {
      sendJson(res, { success: false, message: 'Both from and to are required.' }, 400);
      return;
    }

    try {
      const messages = listConversationMessages(from, to);
      sendJson(res, { success: true, messages });
    } catch (error) {
      console.error('[MESSAGES LIST] error:', error);
      sendJson(res, { success: false, message: 'Unable to load messages.' }, 500);
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/messages') {
    parseBody(req, async (body) => {
      const from = String(body.from || '').trim();
      const to = String(body.to || '').trim();
      const text = String(body.text || '').trim();

      if (!from || !to || !text) {
        sendJson(res, { success: false, message: 'from, to, and text are required.' }, 400);
        return;
      }

      try {
        const message = storeMessage(from, to, text);
        if (!message) {
          sendJson(res, { success: false, message: 'Invalid message payload.' }, 400);
          return;
        }

        sendJson(res, { success: true, message });
      } catch (error) {
        console.error('[MESSAGES CREATE] error:', error);
        sendJson(res, { success: false, message: 'Unable to send message.' }, 500);
      }
    });
    return;
  }

  if (req.method === 'POST' && pathname === '/messages/delete-last') {
    parseBody(req, (body) => {
      const from = String(body.from || '').trim();
      const to = String(body.to || '').trim();

      if (!from || !to) {
        sendJson(res, { success: false, message: 'from and to are required.' }, 400);
        return;
      }

      try {
        const deleted = deleteLastMessageBySender(from, to);
        if (!deleted) {
          sendJson(res, { success: false, message: 'No sent message found to delete.' }, 404);
          return;
        }

        sendJson(res, { success: true, message: 'Last sent message deleted.' });
      } catch (error) {
        console.error('[MESSAGES DELETE LAST] error:', error);
        sendJson(res, { success: false, message: 'Unable to delete message.' }, 500);
      }
    });
    return;
  }

  if (req.method === 'POST' && pathname === '/messages/delete') {
    parseBody(req, (body) => {
      const from = String(body.from || '').trim();
      const to = String(body.to || '').trim();
      const messageId = String(body.messageId || '').trim();

      if (!from || !to || !messageId) {
        sendJson(res, { success: false, message: 'from, to, and messageId are required.' }, 400);
        return;
      }

      try {
        const deleted = deleteMessageById(from, to, messageId);
        if (!deleted) {
          sendJson(res, { success: false, message: 'Selected message was not found.' }, 404);
          return;
        }

        sendJson(res, { success: true, message: 'Message deleted.' });
      } catch (error) {
        console.error('[MESSAGES DELETE] error:', error);
        sendJson(res, { success: false, message: 'Unable to delete selected message.' }, 500);
      }
    });
    return;
  }

  if (req.method === 'POST' && pathname === '/messages/clear') {
    parseBody(req, (body) => {
      const from = String(body.from || '').trim();
      const to = String(body.to || '').trim();

      if (!from || !to) {
        sendJson(res, { success: false, message: 'from and to are required.' }, 400);
        return;
      }

      try {
        const removedCount = clearConversationMessages(from, to);
        sendJson(res, { success: true, removedCount });
      } catch (error) {
        console.error('[MESSAGES CLEAR] error:', error);
        sendJson(res, { success: false, message: 'Unable to clear messages.' }, 500);
      }
    });
    return;
  }

  const filePath = path.join(frontendDir, pathname === '/' ? 'home.html' : pathname.replace(/^\//, ''));
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    sendFile(res, filePath);
    return;
  }

  sendHtml(res, '<h1>Page not found</h1>', 404);
});

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || '0.0.0.0';

async function startServer() {
  await testMySqlConnection();
  await synchronizeUsersAcrossStores();

  server.listen(port, host, () => {
    const networkInterfaces = os.networkInterfaces();
    const lanAddresses = Object.values(networkInterfaces)
      .flat()
      .filter((entry) => entry && entry.family === 'IPv4' && !entry.internal)
      .map((entry) => entry.address);

    const loginUrl = `http://localhost:${port}/`;
    console.log(`Authentication server running at ${loginUrl}`);

    if (lanAddresses.length > 0) {
      console.log(`LAN access: http://${lanAddresses[0]}:${port}`);
    }

    const openBrowser = process.platform === 'win32'
      ? `start "" "${loginUrl}"`
      : process.platform === 'darwin'
        ? `open "${loginUrl}"`
        : `xdg-open "${loginUrl}"`;

    exec(openBrowser, (error) => {
      if (error) {
        console.warn('[SERVER] could not open browser automatically:', error.message);
      }
    });
  });
}

startServer().catch((error) => {
  console.error('[SERVER] startup failed:', error);
  process.exit(1);
});
