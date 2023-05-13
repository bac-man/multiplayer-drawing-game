const WebSocket = require("ws");

const port = 3001;
const server = new WebSocket.Server({ port: port });
console.log(`WebSocket server listening on port ${port}`);

const joinedPlayers = [];
let lineHistory = [];

server.on("connection", (ws) => {
  console.log("A player has connected to the WebSocket server.");
  joinedPlayers.push(ws);
  if (lineHistory.length > 0) {
    ws.send(JSON.stringify({ type: "lineHistory", data: lineHistory }));
  }
  ws.on("message", (data) => {
    let parsedData;
    try {
      parsedData = JSON.parse(data);
    } catch (e) {
      return;
    }
    switch (parsedData?.type) {
      case "newLineData":
        const lineData = parsedData.data;
        if (!lineData || !lineData.length || lineData.length == 0) {
          return;
        }
        for (const point of lineData) {
          if (
            !point ||
            !point.x ||
            isNaN(point.x) ||
            !point.y ||
            isNaN(point.y)
          ) {
            return;
          }
        }
        lineHistory.push(lineData);
        joinedPlayers.forEach((player) => {
          if (player !== ws) {
            player.send(
              JSON.stringify({ type: "newLineData", data: lineData })
            );
          }
        });
        break;
    }
  });
});
