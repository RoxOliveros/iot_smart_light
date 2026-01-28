require("dotenv").config();
const express = require("express");
const rateLimit = require("express-rate-limit");
const pool = require("./db");
const http = require("http");
const { initWebSocket, broadcast } = require("./websocket");

const app = express();
app.use(express.json());

/* ===== RATE LIMIT (BONUS) ===== */
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100
});
app.use(limiter);

/* ===== API KEY AUTH (BONUS) ===== */
function auth(req, res, next) {
  const key = req.headers["x-api-key"];
  if (!key || key !== process.env.API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

/* ===== HEALTH CHECK (BONUS) ===== */
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "OK", database: "connected" });
  } catch (err) {
    res.status(500).json({ status: "ERROR", database: "disconnected" });
  }
});

/* ===== INSERT COMMAND ===== */
async function insertCommand(command, device_id = "default_led") {
  const result = await pool.query(
    `INSERT INTO light_commands(command, device_id)
     VALUES($1, $2) RETURNING *`,
    [command, device_id]
  );
  broadcast({ type: "update", data: result.rows[0] });
  return result.rows[0];
}

/* ===== ENDPOINT 1: ON ===== */
app.post("/api/lights/on", auth, async (req, res) => {
  try {
    const device = req.body.device_id || "default_led";
    const row = await insertCommand("ON", device);
    res.json({ success: true, timestamp: row.timestamp });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

/* ===== ENDPOINT 2: OFF ===== */
app.post("/api/lights/off", auth, async (req, res) => {
  try {
    const device = req.body.device_id || "default_led";
    const row = await insertCommand("OFF", device);
    res.json({ success: true, timestamp: row.timestamp });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

/* ===== ENDPOINT 3: STATUS ===== */
app.get("/api/lights/status", async (req, res) => {
  try {
    const device = req.query.device_id || "default_led";
    const result = await pool.query(
      `SELECT command, timestamp FROM light_commands
       WHERE device_id=$1
       ORDER BY timestamp DESC LIMIT 1`,
      [device]
    );

    if (result.rows.length === 0) {
      return res.json({ status: "OFF", timestamp: null });
    }

    res.json({
      status: result.rows[0].command,
      timestamp: result.rows[0].timestamp
    });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

/* ===== ENDPOINT 4: HISTORY ===== */
app.get("/api/lights/history", async (req, res) => {
  try {
    const device = req.query.device_id || "default_led";
    const result = await pool.query(
      `SELECT command, timestamp FROM light_commands
       WHERE device_id=$1
       ORDER BY timestamp DESC LIMIT 10`,
      [device]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

/* ===== START SERVER ===== */
const server = http.createServer(app);
initWebSocket(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server running on", PORT));
