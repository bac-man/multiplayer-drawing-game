const WebSocket = require("ws");

const port = 3001;
const server = new WebSocket.Server({ port: port });
console.log(`WebSocket server listening on port ${port}`);

server.on("connection", (ws) => {
  console.log("A player has connected to the WebSocket server.");
});
