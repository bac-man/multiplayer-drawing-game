const WebSocket = require("ws");
const { Player } = require("../player");
const { GameSession } = require("./gameSession");
const { RoundHandler } = require("./roundHandler");
const { states } = require("./gameStates");
require("dotenv").config();

const port = process.env.WS_SERVER_PORT || 3001;
const server = new WebSocket.Server({ port: port });
console.log(`\nWebSocket server listening on port ${port}.`);

const session = new GameSession();
const roundStartMessage = "A new round will start shortly.";
const roundHandler = new RoundHandler(session, roundStartMessage);
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

const startPracticeMode = (player) => {
  roundHandler.state = states.PRACTICE_MODE;
  if (roundHandler.timerRunning) {
    roundHandler.stopTimer();
  }
  player.sendMessage(
    "drawerInfoUpdate",
    "Waiting for other players to join..."
  );
  player.sendMessage("backgroundColorUpdate", "orange");
  if (roundHandler.lineHistory.length > 0) {
    roundHandler.lineHistory = [];
    player.sendMessage("lineHistoryWithRedraw", roundHandler.lineHistory);
  }
  player.sendMessage("roundTimeUpdate", "∞");
  roundHandler.selectNewDrawer(player);
  player.sendMessage("drawerStatusChange", true);
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
  session.sendChatMessageToPlayers(`${player.name} has left.`, null, "gray");
  session.players.forEach((joinedPlayer, index) => {
    if (joinedPlayer.ws === player.ws) {
      session.players.splice(index, 1);
    }
  });
  if (session.players.length <= 1) {
    roundHandler.currentDrawer = null;
    roundHandler.currentWord = null;
    roundHandler.previousDrawers = [];
    roundHandler.usedWords = [];
  }
  if (session.players.length === 1) {
    if (roundHandler.state === states.ROUND_INTERMISSION) {
      roundHandler.cancelStart();
    }
    startPracticeMode(session.players[0]);
  } else if (session.players.length === 0) {
    roundHandler.state = states.NO_PLAYERS;
    if (roundHandler.timerRunning) {
      roundHandler.stopTimer();
    }
    return;
  }
  if (
    player.ws === roundHandler.currentDrawer.ws &&
    roundHandler.state !== states.ROUND_INTERMISSION
  ) {
    const drawerLeaveMessage = "The drawer has left. Starting a new round.";
    console.log(drawerLeaveMessage);
    if (roundHandler.currentDrawer) {
      session.sendChatMessageToPlayers(drawerLeaveMessage, null, "blue");
    }
    roundHandler.startNew();
  }
  session.messagePlayers("playerListUpdate", session.findAllPlayerNames());
};

const handleConnection = (player) => {
  nextPlayerNumber++;
  session.players.push(player);

  roundHandler.lateJoiners.push(player);
  player.sendMessage("inputValues", {
    brushStyle: brushStyle,
    chatMessageMaxLength: chatMessageMaxLength,
    playerNameMaxLength: player.nameMaxLength,
  });
  console.log(`${player.name} has connected to the WebSocket server.`);
  session.messagePlayers("playerListUpdate", session.findAllPlayerNames());
  session.sendChatMessageToPlayers(`${player.name} has joined.`, null, "gray");

  switch (roundHandler.state) {
    case states.NO_PLAYERS:
      startPracticeMode(player);
      break;
    case states.PRACTICE_MODE:
      roundHandler.startNew();
      break;
    case states.ROUND_IN_PROGRESS:
      player.sendMessage(
        "drawerInfoUpdate",
        roundHandler.getDrawerInfoMessage()
      );
      player.sendMessage("roundTimeUpdate", roundHandler.timeLeft);
      break;
    case states.ROUND_INTERMISSION:
      player.sendMessage("drawerInfoUpdate", roundStartMessage);
      break;
  }

  if (roundHandler.state !== states.PRACTICE_MODE) {
    let bgColor = "blue";
    if (roundHandler.wordGuessed) {
      bgColor = "green";
    } else if (
      roundHandler.state === states.ROUND_INTERMISSION &&
      roundHandler.timeLeft === 0
    ) {
      bgColor = "red";
    }
    player.sendMessage("backgroundColorUpdate", bgColor);
  }

  if (roundHandler.lineHistory.length > 0) {
    player.sendMessage("lineHistoryWithRedraw", roundHandler.lineHistory);
  }
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
