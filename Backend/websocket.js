let wss;

function initWebSocket(server) {
  const WebSocket = require("ws");
  wss = new WebSocket.Server({ server });

  wss.on("connection", ws => {
    ws.send(JSON.stringify({ type: "connected" }));
  });
}

function broadcast(data) {
  if (!wss) return;
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  });
}

module.exports = { initWebSocket, broadcast };
