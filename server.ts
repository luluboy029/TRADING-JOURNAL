import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "logs.json");

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

// Read logs from persistence
function readLogs() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(SEED_ENTRIES, null, 2), "utf-8");
    return SEED_ENTRIES;
  }
  try {
    const data = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading logs file, restoring seed entries", err);
    return SEED_ENTRIES;
  }
}

// Write logs to persistence
function writeLogs(logs: any[]) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(logs, null, 2), "utf-8");
}

async function startServer() {
  const app = express();

  // Configure high body limit for screenshots (base64 image uploads)
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API logs retrieval
  app.get("/api/logs", (req, res) => {
    try {
      const logs = readLogs();
      res.json(logs);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to read logs" });
    }
  });

  // Create log entry
  app.post("/api/logs", (req, res) => {
    try {
      const newEntry = req.body;
      if (!newEntry.id) {
        newEntry.id = `trade-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      }
      const logs = readLogs();
      const updated = [newEntry, ...logs];
      writeLogs(updated);
      res.status(201).json(newEntry);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to create log" });
    }
  });

  // Update log entry
  app.put("/api/logs/:id", (req, res) => {
    try {
      const { id } = req.params;
      const updatedEntry = req.body;
      const logs = readLogs();
      
      const index = logs.findIndex((item: any) => item.id === id);
      if (index === -1) {
        return res.status(404).json({ error: "Log entry not found" });
      }

      logs[index] = { ...logs[index], ...updatedEntry, id }; // Guard same ID
      writeLogs(logs);
      res.json(logs[index]);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to update log" });
    }
  });

  // Delete log entry
  app.delete("/api/logs/:id", (req, res) => {
    try {
      const { id } = req.params;
      const logs = readLogs();
      const filtered = logs.filter((item: any) => item.id !== id);
      writeLogs(filtered);
      res.json({ success: true, deletedId: id });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to delete log" });
    }
  });

  // Reset database config
  app.post("/api/logs/reset", (req, res) => {
    try {
      writeLogs([]);
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
