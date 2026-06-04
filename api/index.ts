/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const app = express();

// Configure body limits for high-volume uploads such as position flow screenshot previews
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Detect serverless environment to use writable /tmp cache bounds
const DATA_DIR = process.env.VERCEL
  ? "/tmp"
  : path.join(process.cwd(), "data");

const DATA_FILE = path.join(DATA_DIR, "logs.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");
const CAPITAL_FILE = path.join(DATA_DIR, "capital.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default initial Seed entries
const SEED_ENTRIES: any[] = [];

// --- FIRESTORE PERSISTENT DRIVER ---
const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
const API_KEY = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;

const isFirestoreEnabled = !!(PROJECT_ID && API_KEY && PROJECT_ID !== "your-project-id" && API_KEY !== "your-api-key");

if (isFirestoreEnabled) {
  console.log(`[Firestore Engine] Connected to Firebase Project "${PROJECT_ID}". Real-time cloud persistence active!`);
} else {
  console.log(`[Local File Engine] Local ephemeral file storage active in "${DATA_DIR}". Any deployments on stateless hosts like Vercel will reset data between session recycles.`);
}

function sanitizeDocId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_\-]/g, "_");
}

function hashTokenToId(token: string): string {
  return crypto.createHash("md5").update(token).digest("hex");
}

async function fetchAllDocuments(collection: string): Promise<any[]> {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}?key=${API_KEY}&pageSize=1000`;
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 404) return [];
      const errText = await res.text();
      console.error(`[Firestore REST] Error listing ${collection}: ${res.status}`, errText);
      return [];
    }
    const data = await res.json();
    if (!data.documents) return [];
    return data.documents.map((doc: any) => {
      if (doc && doc.fields && doc.fields.data && doc.fields.data.stringValue) {
        try {
          return JSON.parse(doc.fields.data.stringValue);
        } catch {
          return null;
        }
      }
      return null;
    }).filter(Boolean);
  } catch (err) {
    console.error(`[Firestore REST] Fetch error on listing ${collection}`, err);
    return [];
  }
}

async function saveDocument(collection: string, id: string, val: any): Promise<boolean> {
  try {
    const safeDocId = sanitizeDocId(id);
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${safeDocId}?key=${API_KEY}`;
    const payload = {
      fields: {
        data: { stringValue: JSON.stringify(val) },
        ownerId: { stringValue: val.ownerId || val.userId || "" }
      }
    };
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`[Firestore REST] Patch failed on ${collection}/${safeDocId}: ${res.status}`, errText);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[Firestore REST] Fetch error patching ${collection}/${id}`, err);
    return false;
  }
}

async function deleteDocument(collection: string, id: string): Promise<boolean> {
  try {
    const safeDocId = sanitizeDocId(id);
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${safeDocId}?key=${API_KEY}`;
    const res = await fetch(url, {
      method: "DELETE"
    });
    if (!res.ok) {
      if (res.status === 404) return true;
      const errText = await res.text();
      console.error(`[Firestore REST] Delete failed on ${collection}/${safeDocId}: ${res.status}`, errText);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[Firestore REST] Fetch error deleting ${collection}/${id}`, err);
    return false;
  }
}

async function deleteLogsForUser(userId: string) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/logs?key=${API_KEY}&pageSize=1000`;
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    if (!data.documents) return;
    const toDelete = data.documents.filter((doc: any) => {
      return doc.fields && doc.fields.ownerId && doc.fields.ownerId.stringValue === userId;
    });
    const promises = toDelete.map((doc: any) => {
      const parts = doc.name.split("/");
      const id = parts[parts.length - 1];
      return deleteDocument("logs", id);
    });
    await Promise.all(promises);
  } catch (err) {
    console.error("Failed to delete logs for user in Firestore", err);
  }
}

async function readUserById(userId: string): Promise<any | null> {
  if (isFirestoreEnabled) {
    const safeId = sanitizeDocId(userId);
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${safeId}?key=${API_KEY}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const doc = await res.json();
      if (doc && doc.fields && doc.fields.data && doc.fields.data.stringValue) {
        return JSON.parse(doc.fields.data.stringValue);
      }
    } catch (e) {
      console.error("Firestore get user by ID failed", e);
    }
    return null;
  }
  const users = await readUsers();
  return users.find((u: any) => u.id === userId) || null;
}

async function readSession(token: string): Promise<any | null> {
  if (isFirestoreEnabled) {
    const hashId = hashTokenToId(token);
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/sessions/${hashId}?key=${API_KEY}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const doc = await res.json();
      if (doc && doc.fields && doc.fields.data && doc.fields.data.stringValue) {
        return JSON.parse(doc.fields.data.stringValue);
      }
    } catch (e) {
      console.error("Firestore get session failed", e);
    }
    return null;
  }
  const sessions = await readSessions();
  return sessions[token] || null;
}

async function writeSession(token: string, sessionObj: any) {
  if (isFirestoreEnabled) {
    const hashId = hashTokenToId(token);
    await saveDocument("sessions", hashId, { ...sessionObj, token });
    return;
  }
}

// Read/Write Logs helper
async function readLogs(): Promise<any[]> {
  if (isFirestoreEnabled) {
    return await fetchAllDocuments("logs");
  }
  if (!fs.existsSync(DATA_FILE)) {
    const bundleFile = path.join(process.cwd(), "data", "logs.json");
    if (fs.existsSync(bundleFile)) {
      try {
        const data = fs.readFileSync(bundleFile, "utf-8");
        fs.writeFileSync(DATA_FILE, data, "utf-8");
        return JSON.parse(data);
      } catch (err) {
        console.warn("Could not copy pre-committed logs seed to temporary partition", err);
      }
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), "utf-8");
    return [];
  }
  try {
    const data = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading logs file", err);
    return [];
  }
}

async function writeLogs(logs: any[]) {
  if (isFirestoreEnabled) {
    const promises = logs.map(log => saveDocument("logs", log.id, log));
    await Promise.all(promises);
    return;
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(logs, null, 2), "utf-8");
}

// Read/Write Users helper
async function readUsers(): Promise<any[]> {
  if (isFirestoreEnabled) {
    return await fetchAllDocuments("users");
  }
  if (!fs.existsSync(USERS_FILE)) {
    const bundleFile = path.join(process.cwd(), "data", "users.json");
    if (fs.existsSync(bundleFile)) {
      try {
        const data = fs.readFileSync(bundleFile, "utf-8");
        fs.writeFileSync(USERS_FILE, data, "utf-8");
        return JSON.parse(data);
      } catch (err) {
        console.warn("Could not copy pre-committed users seed to temporary partition", err);
      }
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2), "utf-8");
    return [];
  }
  try {
    const data = fs.readFileSync(USERS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading users file", err);
    return [];
  }
}

async function writeUsers(users: any[]) {
  if (isFirestoreEnabled) {
    const promises = users.map(user => saveDocument("users", user.id, user));
    await Promise.all(promises);
    return;
  }
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

// Read/Write Capital helper
async function readCapital(): Promise<any[]> {
  if (isFirestoreEnabled) {
    return await fetchAllDocuments("capital");
  }
  if (!fs.existsSync(CAPITAL_FILE)) {
    const bundleFile = path.join(process.cwd(), "data", "capital.json");
    if (fs.existsSync(bundleFile)) {
      try {
        const data = fs.readFileSync(bundleFile, "utf-8");
        fs.writeFileSync(CAPITAL_FILE, data, "utf-8");
        return JSON.parse(data);
      } catch (err) {
        console.warn("Could not copy pre-committed capital seed to temporary partition", err);
      }
    }
    fs.writeFileSync(CAPITAL_FILE, JSON.stringify([], null, 2), "utf-8");
    return [];
  }
  try {
    const data = fs.readFileSync(CAPITAL_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading capital file", err);
    return [];
  }
}

async function writeCapital(capital: any[]) {
  if (isFirestoreEnabled) {
    const promises = capital.map(item => saveDocument("capital", item.id, item));
    await Promise.all(promises);
    return;
  }
  fs.writeFileSync(CAPITAL_FILE, JSON.stringify(capital, null, 2), "utf-8");
}

// Read/Write Sessions helper
async function readSessions(): Promise<{ [token: string]: { userId: string; username: string; expiresAt: number } }> {
  if (isFirestoreEnabled) {
    const list = await fetchAllDocuments("sessions");
    const map: any = {};
    list.forEach((item: any) => {
      if (item && item.token) {
        map[item.token] = item;
      }
    });
    return map;
  }
  if (!fs.existsSync(SESSIONS_FILE)) {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify({}, null, 2), "utf-8");
    return {};
  }
  try {
    const data = fs.readFileSync(SESSIONS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading sessions file", err);
    return {};
  }
}

async function writeSessions(sessions: any) {
  if (isFirestoreEnabled) {
    const promises = Object.keys(sessions).map(token => saveDocument("sessions", hashTokenToId(token), sessions[token]));
    await Promise.all(promises);
    return;
  }
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), "utf-8");
}

// Password cryptography helpers
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
}

const JWT_SECRET = process.env.JWT_SECRET || "trading_desk_standard_secure_secret_hash_value_1009";

function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

function generateToken(userId: string, username: string): string {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days expiration
  const data = `${userId}:${username}:${expiresAt}`;
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(data).digest("hex");
  return `${Buffer.from(data).toString("base64")}.${signature}`;
}

function verifyStatelessToken(token: string): { userId: string; username: string } | null {
  try {
    const [payloadBase64, signature] = token.split(".");
    if (!payloadBase64 || !signature) return null;
    const data = Buffer.from(payloadBase64, "base64").toString("utf-8");
    const [userId, username, expiresAtStr] = data.split(":");
    if (!userId || !username || !expiresAtStr) return null;

    const expiresAt = parseInt(expiresAtStr, 10);
    if (expiresAt < Date.now()) return null; // Token expired

    const expectedSignature = crypto.createHmac("sha256", JWT_SECRET).update(data).digest("hex");
    if (signature !== expectedSignature) return null; // Signature didn't match

    return { userId, username };
  } catch (e) {
    return null;
  }
}

// Authentication middleware
async function authenticateToken(req: any, res: any, next: any) {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Access token required" });
    }

    let userPayload: { id: string; username: string } | null = null;
    
    if (isFirestoreEnabled) {
      const session = await readSession(token);
      if (session && session.expiresAt >= Date.now()) {
        userPayload = { id: session.userId, username: session.username };
      }
    } else {
      const sessions = await readSessions();
      const session = sessions[token];
      if (session && session.expiresAt >= Date.now()) {
        userPayload = { id: session.userId, username: session.username };
      }
    }

    if (!userPayload) {
      const verified = verifyStatelessToken(token);
      if (verified) {
        userPayload = { id: verified.userId, username: verified.username };
      }
    }

    if (!userPayload) {
      return res.status(401).json({ error: "Session invalid or expired" });
    }

    req.user = userPayload;
    next();
  } catch (err) {
    return res.status(500).json({ error: "Internal authentication error" });
  }
}

// ==================== AUTHENTICATION API ROUTES ====================

// POST: Sync user accounts database from client localStorage (Serverless Auto-Recovery)
app.post("/api/auth/sync", async (req, res) => {
  try {
    const { users: localUsers } = req.body;
    if (!Array.isArray(localUsers)) {
      return res.status(400).json({ error: "Invalid sync request format" });
    }

    const currentUsers = await readUsers();
    let updatedCount = 0;

    for (const u of localUsers) {
      if (!u.username || !u.id || !u.passwordHash || !u.salt) continue;
      const normalized = u.username.trim().toLowerCase();
      const exists = currentUsers.some((curr: any) => curr.username === normalized || curr.id === u.id);
      if (!exists) {
        const newUser = {
          id: u.id,
          username: normalized,
          passwordHash: u.passwordHash,
          salt: u.salt,
          createdAt: u.createdAt || new Date().toISOString()
        };
        currentUsers.push(newUser);
        if (isFirestoreEnabled) {
          await saveDocument("users", u.id, newUser);
        }
        updatedCount++;
      }
    }

    if (!isFirestoreEnabled && updatedCount > 0) {
      await writeUsers(currentUsers);
    }

    res.json({ success: true, syncedUsersCount: updatedCount });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to sync user accounts" });
  }
});

// POST: Sign Up
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password || typeof username !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const trimmedUser = username.trim().toLowerCase();
    if (trimmedUser.length < 3) {
      return res.status(400).json({ error: "Username must be at least 3 characters" });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: "Password must be at least 4 characters" });
    }

    const users = await readUsers();
    const existingUser = users.find((u: any) => u.username === trimmedUser);
    if (existingUser) {
      return res.status(400).json({ error: "Username already taken" });
    }

    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);
    
    // Deterministic userId ensures local browser caching is 100% resilient to server container deletions
    const userId = `user-${trimmedUser}`;

    const newUser = {
      id: userId,
      username: trimmedUser,
      passwordHash,
      salt,
      createdAt: new Date().toISOString()
    };

    if (isFirestoreEnabled) {
      await saveDocument("users", userId, newUser);
    } else {
      users.push(newUser);
      await writeUsers(users);
    }

    // One-time pre-load seed entries for this brand new user inside the backend logs storage!
    try {
      const logs = await readLogs();
      const userSeeds = SEED_ENTRIES.map((entry) => ({
        ...entry,
        id: `trade-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        ownerId: userId
      }));
      if (isFirestoreEnabled) {
        for (const seed of userSeeds) {
          await saveDocument("logs", seed.id, seed);
        }
      } else {
        const updatedLogs = [...userSeeds, ...logs];
        await writeLogs(updatedLogs);
      }
    } catch (seedErr) {
      console.error("Failed to seed initial user logs on signup", seedErr);
    }

    // Create session
    const token = generateToken(userId, trimmedUser);
    const sessionObj = {
      userId,
      username: trimmedUser,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7 // 7 days expiration
    };

    if (isFirestoreEnabled) {
      await writeSession(token, sessionObj);
    } else {
      const sessions = await readSessions();
      sessions[token] = sessionObj;
      await writeSessions(sessions);
    }

    res.status(201).json({
      token,
      user: { id: userId, username: trimmedUser },
      syncPayload: { id: userId, username: trimmedUser, passwordHash, salt, createdAt: newUser.createdAt }
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to complete sign up" });
  }
});

// POST: Sign In
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const trimmedUser = username.trim().toLowerCase();
    const userId = `user-${trimmedUser}`;
    const user = await readUserById(userId);

    // Dynamic Serverless Auto-Recovery: if user doesn't exist but has signed in before on stateless client,
    // we can dynamically register of sign-in, but since we cannot recover their raw password, 
    // let's do safe login check. If user exists: check password.
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const hash = hashPassword(password, user.salt);
    if (hash !== user.passwordHash) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Generate stateless token
    const token = generateToken(user.id, user.username);
    const sessionObj = {
      userId: user.id,
      username: user.username,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7 // 7 days expiration
    };

    if (isFirestoreEnabled) {
      await writeSession(token, sessionObj);
    } else {
      const sessions = await readSessions();
      sessions[token] = sessionObj;
      await writeSessions(sessions);
    }

    res.json({
      token,
      user: { id: user.id, username: user.username },
      syncPayload: { id: user.id, username: user.username, passwordHash: user.passwordHash, salt: user.salt, createdAt: user.createdAt }
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to sign in" });
  }
});

// GET: Validate session / Get user profile
app.get("/api/auth/me", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // 1. Check sessions
    let userPayload: { id: string; username: string } | null = null;
    if (isFirestoreEnabled) {
      const session = await readSession(token);
      if (session && session.expiresAt >= Date.now()) {
        userPayload = { id: session.userId, username: session.username };
      }
    } else {
      const sessions = await readSessions();
      const session = sessions[token];
      if (session && session.expiresAt >= Date.now()) {
        userPayload = { id: session.userId, username: session.username };
      }
    }

    if (!userPayload) {
      // 2. Fallback to stateless JWT-style verification
      const verified = verifyStatelessToken(token);
      if (verified) {
        userPayload = { id: verified.userId, username: verified.username };
      }
    }

    if (!userPayload) {
      return res.status(401).json({ error: "Session invalid or expired" });
    }

    res.json({
      user: userPayload
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to get auth details" });
  }
});

// POST: Log out
app.post("/api/auth/logout", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (token) {
      if (isFirestoreEnabled) {
        await deleteDocument("sessions", hashTokenToId(token));
      } else {
        const sessions = await readSessions();
        if (sessions[token]) {
          delete sessions[token];
          await writeSessions(sessions);
        }
      }
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to logout" });
  }
});

// ==================== LOGS API ROUTES (SCOPED TO AUTHENTICATED USER) ====================

// POST: Sync/Restore entire categories of logs from the client's localStorage (Serverless Auto-Recovery)
app.post("/api/logs/sync", authenticateToken, async (req: any, res) => {
  try {
    const { logs: clientLogs } = req.body;
    if (!Array.isArray(clientLogs)) {
      return res.status(400).json({ error: "Invalid logs sync request format" });
    }

    const verifiedClientLogs = clientLogs.map((item: any) => ({
      ...item,
      ownerId: req.user.id
    }));

    if (isFirestoreEnabled) {
      for (const log of verifiedClientLogs) {
        await saveDocument("logs", log.id, log);
      }
    } else {
      const serverLogs = await readLogs();
      // Filter out existing server logs belonging to the current user
      const otherUsersLogs = serverLogs.filter((item: any) => item.ownerId !== req.user.id);
      // Recombine and write
      const combined = [...verifiedClientLogs, ...otherUsersLogs];
      await writeLogs(combined);
    }

    res.json({ success: true, syncedLogsCount: verifiedClientLogs.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to sync trade logs" });
  }
});

// API logs retrieval
app.get("/api/logs", authenticateToken, async (req: any, res) => {
  try {
    const logs = await readLogs();
    const userLogs = logs.filter((log: any) => log.ownerId === req.user.id);
    res.json(userLogs);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to read logs" });
  }
});

// Create log entry
app.post("/api/logs", authenticateToken, async (req: any, res) => {
  try {
    const newEntry = req.body;
    newEntry.id = `trade-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    newEntry.ownerId = req.user.id; // Assign owner explicitly

    if (isFirestoreEnabled) {
      await saveDocument("logs", newEntry.id, newEntry);
    } else {
      const logs = await readLogs();
      const updated = [newEntry, ...logs];
      await writeLogs(updated);
    }
    res.status(201).json(newEntry);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to create log" });
  }
});

// Update log entry
app.put("/api/logs/:id", authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const updatedEntry = req.body;
    const logs = await readLogs();
    
    const index = logs.findIndex((item: any) => item.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Log entry not found" });
    }

    // Check ownership
    if (logs[index].ownerId !== req.user.id) {
      return res.status(403).json({ error: "Access denied to compile modifications on this resource" });
    }

    const finalEntry = { ...logs[index], ...updatedEntry, id, ownerId: req.user.id }; // Maintain same ID & ownerId
    if (isFirestoreEnabled) {
      await saveDocument("logs", id, finalEntry);
    } else {
      logs[index] = finalEntry;
      await writeLogs(logs);
    }
    res.json(finalEntry);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to update log" });
  }
});

// Delete log entry
app.delete("/api/logs/:id", authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const logs = await readLogs();
    const index = logs.findIndex((item: any) => item.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: "Log entry not found" });
    }

    // Check ownership
    if (logs[index].ownerId !== req.user.id) {
      return res.status(403).json({ error: "Access denied to compile deletion on this resource" });
    }

    if (isFirestoreEnabled) {
      await deleteDocument("logs", id);
    } else {
      const filtered = logs.filter((item: any) => item.id !== id);
      await writeLogs(filtered);
    }
    res.json({ success: true, deletedId: id });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to delete log" });
  }
});

// Reset database logs for the current user only
app.post("/api/logs/reset", authenticateToken, async (req: any, res) => {
  try {
    if (isFirestoreEnabled) {
      await deleteLogsForUser(req.user.id);
    } else {
      const logs = await readLogs();
      const filtered = logs.filter((item: any) => item.ownerId !== req.user.id);
      await writeLogs(filtered);
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to reset database logs" });
  }
});

// ==================== CAPITAL API ROUTES (SCOPED TO AUTHENTICATED USER) ====================

// POST: Sync/Restore entire categories of capital entries from the client's localStorage (Serverless Auto-Recovery)
app.post("/api/capital/sync", authenticateToken, async (req: any, res) => {
  try {
    const { capital: clientCapital } = req.body;
    if (!Array.isArray(clientCapital)) {
      return res.status(400).json({ error: "Invalid capital sync request format" });
    }

    const verifiedClientCapital = clientCapital.map((item: any) => ({
      ...item,
      ownerId: req.user.id
    }));

    if (isFirestoreEnabled) {
      for (const cap of verifiedClientCapital) {
        await saveDocument("capital", cap.id, cap);
      }
    } else {
      const serverCapital = await readCapital();
      // Filter out existing server capital belonging to the current user
      const otherUsersCapital = serverCapital.filter((item: any) => item.ownerId !== req.user.id);
      // Recombine and write
      const combined = [...verifiedClientCapital, ...otherUsersCapital];
      await writeCapital(combined);
    }

    res.json({ success: true, syncedCapitalCount: verifiedClientCapital.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to sync capital entries" });
  }
});

// API capital retrieval
app.get("/api/capital", authenticateToken, async (req: any, res) => {
  try {
    const capital = await readCapital();
    const userCapital = capital.filter((item: any) => item.ownerId === req.user.id);
    res.json(userCapital);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to read capital entries" });
  }
});

// Create capital entry
app.post("/api/capital", authenticateToken, async (req: any, res) => {
  try {
    const newEntry = req.body;
    newEntry.id = `cap-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    newEntry.ownerId = req.user.id; // Assign owner explicitly

    if (isFirestoreEnabled) {
      await saveDocument("capital", newEntry.id, newEntry);
    } else {
      const capital = await readCapital();
      const updated = [newEntry, ...capital];
      await writeCapital(updated);
    }
    res.status(201).json(newEntry);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to create capital entry" });
  }
});

// Update capital entry
app.put("/api/capital/:id", authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const updatedEntry = req.body;
    const capital = await readCapital();
    
    const index = capital.findIndex((item: any) => item.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Capital entry not found" });
    }

    // Check ownership
    if (capital[index].ownerId !== req.user.id) {
      return res.status(403).json({ error: "Access denied to compile modifications on this resource" });
    }

    const finalEntry = { ...capital[index], ...updatedEntry, id, ownerId: req.user.id }; // Maintain same ID & ownerId
    if (isFirestoreEnabled) {
      await saveDocument("capital", id, finalEntry);
    } else {
      capital[index] = finalEntry;
      await writeCapital(capital);
    }
    res.json(finalEntry);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to update capital entry" });
  }
});

// Delete capital entry
app.delete("/api/capital/:id", authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const capital = await readCapital();
    const index = capital.findIndex((item: any) => item.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: "Capital entry not found" });
    }

    // Check ownership
    if (capital[index].ownerId !== req.user.id) {
      return res.status(403).json({ error: "Access denied to compile deletion on this resource" });
    }

    if (isFirestoreEnabled) {
      await deleteDocument("capital", id);
    } else {
      const filtered = capital.filter((item: any) => item.id !== id);
      await writeCapital(filtered);
    }
    res.json({ success: true, deletedId: id });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to delete capital entry" });
  }
});

export default app;
