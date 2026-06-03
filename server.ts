import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";

const PORT = 3000;
const DATA_DIR = process.env.VERCEL
  ? "/tmp"
  : path.join(process.cwd(), "data");

const DATA_FILE = path.join(DATA_DIR, "logs.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default initial Seed entries
const SEED_ENTRIES = [
  {
    id: "seed-trade-1",
    entryDate: new Date(Date.now() - 0 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    symbol: "BTCUSDT",
    assetClass: "Crypto",
    side: "long",
    entryPrice: 94600.00,
    exitPrice: 98150.00,
    quantity: 0.15,
    pnl: 532.50,
    fees: 12.50,
    status: "win",
    setup: "Breakout Accumulation",
    notes: "Captured a clean breakout of the multi-day horizontal accumulation zone above $94.5K. Momentum was supported by strong institutional volume and short liquidations. Trailed stop efficiently to lock in max premium. Executed flawlessly.",
    riskAmount: 150.00,
    targetPrice: 98500.00,
    stopLoss: 93500.00,
    emotion: "Disciplined",
    screenshot: "https://images.unsplash.com/photo-1642104704074-907c0698cbd9?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "seed-trade-2",
    entryDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    symbol: "EURUSD",
    assetClass: "Forex",
    side: "short",
    entryPrice: 1.0850,
    exitPrice: 1.0790,
    quantity: 100000,
    pnl: 600.00,
    fees: 15.00,
    status: "win",
    setup: "VWAP Mean Reversion",
    notes: "Identified an overextended rally near the upper daily average envelope. Entered short in batches near the horizontal standard deviation block. Profit target met preceding high-impact economic announcement. Fees were standard.",
    riskAmount: 200.00,
    targetPrice: 1.0780,
    stopLoss: 1.0875,
    emotion: "Patient"
  },
  {
    id: "seed-trade-3",
    entryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    symbol: "AAPL",
    assetClass: "Stocks",
    side: "long",
    entryPrice: 224.50,
    exitPrice: 221.20,
    quantity: 60,
    pnl: -198.00,
    fees: 8.00,
    status: "loss",
    setup: "Golden Cross Bounce",
    notes: "Attempted to position long on the golden cross pullback near the moving averages block. Volume was disappointing, prompting an early stop deviation. Discipline was steady; loss was controlled under my portfolio risk tolerance limits.",
    riskAmount: 220.00,
    targetPrice: 232.00,
    stopLoss: 221.00,
    emotion: "Anxious"
  },
  {
    id: "seed-trade-4",
    entryDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    symbol: "SOLUSDT",
    assetClass: "Crypto",
    side: "long",
    entryPrice: 185.00,
    quantity: 30,
    fees: 4.50,
    status: "open",
    setup: "Support Accumulation",
    notes: "Opened a swing position on lateral horizontal support. Price has entered accumulation near the range bounds. Holding position, stop is initialized safely under support.",
    riskAmount: 100.00,
    targetPrice: 210.00,
    stopLoss: 180.00,
    emotion: "Patient"
  }
];

// Read/Write Logs helper
function readLogs(): any[] {
  if (!fs.existsSync(DATA_FILE)) {
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

function writeLogs(logs: any[]) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(logs, null, 2), "utf-8");
}

// Read/Write Users helper
function readUsers(): any[] {
  if (!fs.existsSync(USERS_FILE)) {
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

function writeUsers(users: any[]) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

// Read/Write Sessions helper
function readSessions(): { [token: string]: { userId: string; username: string; expiresAt: number } } {
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

function writeSessions(sessions: any) {
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
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  // 1. Try checking sessions store (Legacy/Cache)
  let userPayload: { id: string; username: string } | null = null;
  const sessions = readSessions();
  const session = sessions[token];

  if (session && session.expiresAt >= Date.now()) {
    userPayload = { id: session.userId, username: session.username };
  } else {
    // 2. Fallback to stateless JWT token signature check
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
}

async function startServer() {
  const app = express();

  // Configure high body limit for screenshots (base64 image uploads)
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // ==================== AUTHENTICATION API ROUTES ====================

  // POST: Sync user accounts database from client localStorage (Serverless Auto-Recovery)
  app.post("/api/auth/sync", (req, res) => {
    try {
      const { users: localUsers } = req.body;
      if (!Array.isArray(localUsers)) {
        return res.status(400).json({ error: "Invalid sync request format" });
      }

      const currentUsers = readUsers();
      let updatedCount = 0;

      for (const u of localUsers) {
        if (!u.username || !u.id || !u.passwordHash || !u.salt) continue;
        const normalized = u.username.trim().toLowerCase();
        const exists = currentUsers.some((curr: any) => curr.username === normalized || curr.id === u.id);
        if (!exists) {
          currentUsers.push({
            id: u.id,
            username: normalized,
            passwordHash: u.passwordHash,
            salt: u.salt,
            createdAt: u.createdAt || new Date().toISOString()
          });
          updatedCount++;
        }
      }

      if (updatedCount > 0) {
        writeUsers(currentUsers);
      }

      res.json({ success: true, syncedUsersCount: updatedCount });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to sync user accounts" });
    }
  });

  // POST: Sign Up
  app.post("/api/auth/signup", (req, res) => {
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

      const users = readUsers();
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

      users.push(newUser);
      writeUsers(users);

      // One-time pre-load seed entries for this brand new user inside the backend logs storage!
      try {
        const logs = readLogs();
        const userSeeds = SEED_ENTRIES.map((entry) => ({
          ...entry,
          id: `trade-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          ownerId: userId
        }));
        const updatedLogs = [...userSeeds, ...logs];
        writeLogs(updatedLogs);
      } catch (seedErr) {
        console.error("Failed to seed initial user logs on signup", seedErr);
      }

      // Create session
      const token = generateToken(userId, trimmedUser);
      const sessions = readSessions();
      sessions[token] = {
        userId,
        username: trimmedUser,
        expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7 // 7 days expiration
      };
      writeSessions(sessions);

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
  app.post("/api/auth/login", (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      const trimmedUser = username.trim().toLowerCase();
      const users = readUsers();
      let user = users.find((u: any) => u.username === trimmedUser);

      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      const hash = hashPassword(password, user.salt);
      if (hash !== user.passwordHash) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      // Generate stateless token
      const token = generateToken(user.id, user.username);
      const sessions = readSessions();
      sessions[token] = {
        userId: user.id,
        username: user.username,
        expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7 // 7 days expiration
      };
      writeSessions(sessions);

      res.json({
        token,
        user: { id: user.id, username: user.username }
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to sign in" });
    }
  });

  // GET: Validate session / Get user profile
  app.get("/api/auth/me", (req, res) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // 1. Check sessions
    let userPayload: { id: string; username: string } | null = null;
    const sessions = readSessions();
    const session = sessions[token];

    if (session && session.expiresAt >= Date.now()) {
      userPayload = { id: session.userId, username: session.username };
    } else {
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
  });

  // POST: Log out
  app.post("/api/auth/logout", (req, res) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (token) {
      const sessions = readSessions();
      if (sessions[token]) {
        delete sessions[token];
        writeSessions(sessions);
      }
    }
    res.json({ success: true });
  });

  // ==================== LOGS API ROUTES (SCOPED TO AUTHENTICATED USER) ====================

  // POST: Sync/Restore entire categories of logs from the client's localStorage (Serverless Auto-Recovery)
  app.post("/api/logs/sync", authenticateToken, (req: any, res) => {
    try {
      const { logs: clientLogs } = req.body;
      if (!Array.isArray(clientLogs)) {
        return res.status(400).json({ error: "Invalid logs sync request format" });
      }

      const serverLogs = readLogs();
      
      // Filter out existing server logs belonging to the current user
      const otherUsersLogs = serverLogs.filter((item: any) => item.ownerId !== req.user.id);

      // Enforce correct ownerId of the current user on all incoming logs to make it safe
      const verifiedClientLogs = clientLogs.map((item: any) => ({
        ...item,
        ownerId: req.user.id
      }));

      // Recombine and write
      const combined = [...verifiedClientLogs, ...otherUsersLogs];
      writeLogs(combined);

      res.json({ success: true, syncedLogsCount: verifiedClientLogs.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to sync trade logs" });
    }
  });

  // API logs retrieval
  app.get("/api/logs", authenticateToken, (req: any, res) => {
    try {
      const logs = readLogs();
      const userLogs = logs.filter((log: any) => log.ownerId === req.user.id);
      res.json(userLogs);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to read logs" });
    }
  });

  // Create log entry
  app.post("/api/logs", authenticateToken, (req: any, res) => {
    try {
      const newEntry = req.body;
      newEntry.id = `trade-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      newEntry.ownerId = req.user.id; // Assign owner explicitly

      const logs = readLogs();
      const updated = [newEntry, ...logs];
      writeLogs(updated);
      res.status(201).json(newEntry);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to create log" });
    }
  });

  // Update log entry
  app.put("/api/logs/:id", authenticateToken, (req: any, res) => {
    try {
      const { id } = req.params;
      const updatedEntry = req.body;
      const logs = readLogs();
      
      const index = logs.findIndex((item: any) => item.id === id);
      if (index === -1) {
        return res.status(404).json({ error: "Log entry not found" });
      }

      // Check ownership
      if (logs[index].ownerId !== req.user.id) {
        return res.status(403).json({ error: "Access denied to compile modifications on this resource" });
      }

      logs[index] = { ...logs[index], ...updatedEntry, id, ownerId: req.user.id }; // Maintain same ID & ownerId
      writeLogs(logs);
      res.json(logs[index]);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to update log" });
    }
  });

  // Delete log entry
  app.delete("/api/logs/:id", authenticateToken, (req: any, res) => {
    try {
      const { id } = req.params;
      const logs = readLogs();
      const index = logs.findIndex((item: any) => item.id === id);
      
      if (index === -1) {
        return res.status(404).json({ error: "Log entry not found" });
      }

      // Check ownership
      if (logs[index].ownerId !== req.user.id) {
        return res.status(403).json({ error: "Access denied to compile deletion on this resource" });
      }

      const filtered = logs.filter((item: any) => item.id !== id);
      writeLogs(filtered);
      res.json({ success: true, deletedId: id });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to delete log" });
    }
  });

  // Reset database logs for the current user only
  app.post("/api/logs/reset", authenticateToken, (req: any, res) => {
    try {
      const logs = readLogs();
      // Keep other users' logs, but filter out current user's logs
      const filtered = logs.filter((item: any) => item.ownerId !== req.user.id);
      writeLogs(filtered);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to reset database logs" });
    }
  });

  // Setup Vite Dev middleware or static folder serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Backend Server] listening on http://localhost:${PORT}`);
  });
}

startServer();
