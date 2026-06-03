import express from "express";
import path from "path";
import fs from "fs";

const app = express();

// Configure body limits for high-volume uploads such as position flow screenshot previews
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Detect serverless environment to use writable /tmp cache bounds
const DATA_DIR = process.env.VERCEL
  ? "/tmp"
  : path.join(process.cwd(), "data");

const DATA_FILE = path.join(DATA_DIR, "logs.json");

// Ensure data directory bounds are initialized
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial seed entries
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

// Read helper logs function
function readLogs() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(SEED_ENTRIES, null, 2), "utf-8");
    return SEED_ENTRIES;
  }
  try {
    const data = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.warn("Soft conflict reading logs. Fallback to seed entries", err);
    return SEED_ENTRIES;
  }
}

// Write helper logs function
function writeLogs(logs: any[]) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(logs, null, 2), "utf-8");
}

// API endpoint - Fetch logs
app.get("/api/logs", (req, res) => {
  try {
    const logs = readLogs();
    res.json(logs);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to retrieve database logs" });
  }
});

// API endpoint - Add log
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
    res.status(500).json({ error: e.message || "Failed to save entry log" });
  }
});

// API endpoint - Update log
app.put("/api/logs/:id", (req, res) => {
  try {
    const { id } = req.params;
    const updatedEntry = req.body;
    const logs = readLogs();

    const idx = logs.findIndex((item: any) => item.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Trade entry log not found" });
    }

    logs[idx] = { ...logs[idx], ...updatedEntry, id };
    writeLogs(logs);
    res.json(logs[idx]);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to modify entry log" });
  }
});

// API endpoint - Delete log
app.delete("/api/logs/:id", (req, res) => {
  try {
    const { id } = req.params;
    const logs = readLogs();
    const filtered = logs.filter((item: any) => item.id !== id);
    writeLogs(filtered);
    res.json({ success: true, deletedId: id });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to destroy log entry" });
  }
});

// API endpoint - Reset database
app.post("/api/logs/reset", (req, res) => {
  try {
    writeLogs([]);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to wipe logging register" });
  }
});

// Export default application handler so Vercel hooks into it flawlessly
export default app;
