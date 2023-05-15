const WebSocket = require("ws");

const port = 3001;
const server = new WebSocket.Server({ port: port });
console.log(`WebSocket server listening on port ${port}`);

const joinedPlayers = [];
let lineHistory = [];
let chatHistory = [];
let currentDrawer;
let nextPlayerNumber = 1;

const handleNewLineData = (sender, lineData) => {
  if (sender.ws !== currentDrawer.ws) {
    return;
  }
  if (!lineData || !lineData.length || lineData.length == 0) {
    return;
  }
  for (const point of lineData) {
    if (!point || !point.x || isNaN(point.x) || !point.y || isNaN(point.y)) {
      return;
    }
  }
  lineHistory.push(lineData);
  joinedPlayers.forEach((player) => {
    if (player.ws !== sender.ws) {
      player.ws.send(JSON.stringify({ type: "newLineData", data: lineData }));
    }
    player.ws.send(JSON.stringify({ type: "lineHistory", data: lineHistory }));
  });
};

const handleChatMessage = (sender, text) => {
  const message = { sender: sender.name, text: text };
  joinedPlayers.forEach((joinedPlayer) => {
    joinedPlayer.ws.send(
      JSON.stringify({
        type: "chatMessage",
        data: message,
      })
    );
  });
  chatHistory.push(message);
};

server.on("connection", (ws) => {
  const player = { name: `Player ${nextPlayerNumber}`, ws: ws };
  nextPlayerNumber++;
  joinedPlayers.push(player);
  console.log(`${player.name} has connected to the WebSocket server.`);
  if (!currentDrawer) {
    currentDrawer = player;
    console.log(`${player.name} is now the drawer.`);
    ws.send(JSON.stringify({ type: "drawerStatusChange", data: true }));
  }
  if (lineHistory.length > 0) {
    ws.send(JSON.stringify({ type: "lineHistoryCatchUp", data: lineHistory }));
  }
  if (chatHistory.length > 0) {
    ws.send(JSON.stringify({ type: "chatHistory", data: chatHistory }));
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
        handleNewLineData(player, parsedData.data);
        break;
      case "chatMessage":
        handleChatMessage(player, parsedData.data);
        break;
    }
  });
  ws.on("close", () => {
    console.log(`${player.name} has disconnected from the WebSocket server.`);
    joinedPlayers.forEach((player, index) => {
      if (player.ws === ws) {
        joinedPlayers.splice(index, 1);
      }
    });
  });
});
