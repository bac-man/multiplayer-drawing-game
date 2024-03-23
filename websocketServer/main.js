const WebSocket = require("ws");
const { Player } = require("./player");
const { GameSession } = require("./gameSession");
const { RoundHandler } = require("./roundHandler");
const { states } = require("./gameStates");
require("dotenv").config();

const port = process.env.WS_SERVER_PORT || 3001;
const server = new WebSocket.Server({ port: port });
console.log(`\nWebSocket server listening on port ${port}.`);

const session = new GameSession();
const roundHandler = new RoundHandler(session);
let nextPlayerNumber = 1;
const chatMessageMaxLength = 50;
const maxBrushSize = 100;
const brushStyle = {
  lineWidth: parseInt(maxBrushSize / 3),
  lineCap: "round",
  strokeStyle: "#000000",
  maxBrushSize: maxBrushSize,
};

const handleNewLineData = (sender, lineData) => {
  if (
    sender.ws !== roundHandler.currentDrawer.ws ||
    !lineData?.length ||
    lineData.length == 0 ||
    typeof lineData === "string"
  ) {
    return;
  }
  for (const point of lineData) {
    if (!point || !point.x || isNaN(point.x) || !point.y || isNaN(point.y)) {
      return;
    }
    if (
      point.options.lineWidth > maxBrushSize ||
      point.options.lineWidth < 1 ||
      point.options.lineCap !== brushStyle.lineCap
    ) {
      // Remove the disallowed line from the drawer's canvas
      roundHandler.currentDrawer.sendMessage(
        "lineHistoryWithRedraw",
        roundHandler.lineHistory
      );
      return;
    }
  }
  roundHandler.lineHistory.push(lineData);
  session.messagePlayers("lineHistory", roundHandler.lineHistory);
  session.messagePlayers("newLineData", lineData, roundHandler.currentDrawer);
};

const handleUndoDrawing = (sender, clearAll) => {
  if (
    sender.ws !== roundHandler.currentDrawer.ws ||
    roundHandler.lineHistory.length == 0
  ) {
    return;
  }
  if (clearAll) {
    roundHandler.lineHistory = [];
  } else {
    roundHandler.lineHistory.pop();
  }
  session.messagePlayers("lineHistoryWithRedraw", roundHandler.lineHistory);
};

const handleChatMessage = (sender, text) => {
  if (text.length > chatMessageMaxLength) {
    return;
  }
  if (
    roundHandler.state === states.ROUND_IN_PROGRESS &&
    sender.ws !== roundHandler.currentDrawer.ws &&
    text.toLowerCase() === roundHandler.currentWord.toLowerCase()
  ) {
    roundHandler.handleCorrectGuess(sender.name);
  } else {
    session.sendChatMessageToPlayers(text, sender.name);
  }
};

const handleNameChangeRequest = (player, requestedName) => {
  const validName = player.checkRequestedNameValidity(requestedName);
  let nameAvailable = true;
  if (validName) {
    for (const joinedPlayer of session.players) {
      if (joinedPlayer.name.toLowerCase() === requestedName.toLowerCase()) {
        nameAvailable = false;
        break;
      }
    }
  }
  if (validName && nameAvailable) {
    session.sendChatMessageToPlayers(
      `${player.name} changed their name to ${requestedName}.`,
      null,
      "gray"
    );
    player.name = requestedName;
    session.messagePlayers("playerListUpdate", session.findAllPlayerNames());
    if (
      player === roundHandler.currentDrawer &&
      roundHandler.state !== states.ROUND_INTERMISSION
    ) {
      session.messagePlayers(
        "drawerInfoUpdate",
        roundHandler.getDrawerInfoMessage(),
        roundHandler.currentDrawer
      );
    }
    player.sendMessage("nameChangeStatus", {
      success: true,
      message: "Your name has been changed.",
    });
  } else {
    player.sendMessage("nameChangeStatus", {
      success: false,
      message: "That name is unavailable. Please choose another name.",
    });
  }
};

const handleClose = (player) => {
  console.log(`${player.name} has disconnected from the WebSocket server.`);
  session.removePlayer(player);
  roundHandler.handleLeavingPlayer(player);
};

const handleConnection = (player) => {
  nextPlayerNumber++;
  session.addPlayer(player);
  roundHandler.lateJoiners.push(player);
  player.sendMessage("inputValues", {
    brushStyle: brushStyle,
    chatMessageMaxLength: chatMessageMaxLength,
    playerNameMaxLength: player.nameMaxLength,
  });

  roundHandler.handleNewPlayer(player);
  console.log(`${player.name} has connected to the WebSocket server.`);
  if (session.chatHistory.length > 0) {
    player.sendMessage("chatHistory", session.chatHistory);
  }
};

const handleMessage = (data, player) => {
  let parsedData;
  try {
    parsedData = JSON.parse(data);
  } catch (e) {
    return;
  }
  switch (parsedData?.type) {
    case "nameChangeRequest":
      handleNameChangeRequest(player, parsedData.data);
      break;
    case "newLineData":
      handleNewLineData(player, parsedData.data);
      break;
    case "chatMessage":
      handleChatMessage(player, parsedData.data);
      break;
    case "undoDrawing":
      handleUndoDrawing(player, parsedData.data);
      break;
  }
};

server.on("connection", (ws) => {
  const player = new Player(`Player ${nextPlayerNumber}`, ws);
  handleConnection(player);
  ws.on("message", (data) => {
    handleMessage(data, player);
  });
  ws.on("close", () => {
    handleClose(player);
  });
});
