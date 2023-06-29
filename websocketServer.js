const WebSocket = require("ws");
require("dotenv").config();

let wordList;
try {
  wordList = require("./data/wordList.json");
} catch (e) {
  console.log("Unable to find word list. Exiting.");
  return;
}

const port = process.env.WS_SERVER_PORT || 3001;
const server = new WebSocket.Server({ port: port });
console.log(`WebSocket server listening on port ${port}`);

const joinedPlayers = [];
let lineHistory = [];
let chatHistory = [];
let currentDrawer;
let nextPlayerNumber = 1;
let playersJoinedDuringRound = [];
let currentWord;
let usedWords = [];
let previousDrawers = [];
const roundDuration = 60;
let roundTimeLeft;
let roundTimerInterval;
let roundIntermission = false;
let practiceMode = false;
let cancelRound = false;
const roundStartMessage = "A new round will start shortly.";
const chatMessageMaxLength = 50;
const maxBrushSize = 100;
const brushStyle = {
  lineWidth: parseInt(maxBrushSize / 3),
  lineCap: "round",
  strokeStyle: "#000000",
  maxBrushSize: maxBrushSize,
};

const sendMessageToPlayers = (type, value, excludeCurrentDrawer = false) => {
  joinedPlayers.forEach((player) => {
    if (
      !excludeCurrentDrawer ||
      (excludeCurrentDrawer && player.ws !== currentDrawer.ws)
    ) {
      player?.ws?.send(JSON.stringify({ type: type, value: value }));
    }
  });
};

const sendMessageToPlayer = (player, type, value) => {
  player?.ws?.send(JSON.stringify({ type: type, value: value }));
};

const getDrawerInfoMessage = (playerIsDrawer = false) => {
  return playerIsDrawer
    ? `You are the drawer. The word is "${currentWord.toLowerCase()}".`
    : `${currentDrawer?.name} is drawing.`;
};

const selectNewWord = (previousWord = null) => {
  if (usedWords.length == wordList.length) {
    usedWords = [];
  }
  let newWordSelected = false;
  while (!newWordSelected) {
    const selectedWord = wordList[getRandomNumber(wordList.length - 1)];
    if (!usedWords.includes(selectedWord) && selectedWord !== previousWord) {
      currentWord = selectedWord;
      newWordSelected = true;
    }
  }
  if (currentWord) {
    console.log(`"${currentWord}" was chosen as the word.`);
  }
};

const selectNewDrawer = (newDrawer = null) => {
  if (newDrawer) {
    currentDrawer = newDrawer;
  } else {
    let newDrawerSelected = false;
    for (const joinedPlayer of joinedPlayers) {
      if (
        !previousDrawers.includes(joinedPlayer) &&
        !playersJoinedDuringRound.includes(joinedPlayer)
      ) {
        currentDrawer = joinedPlayer;
        newDrawerSelected = true;
        break;
      }
    }
    if (!newDrawerSelected) {
      previousDrawers = [];
      currentDrawer = joinedPlayers[0];
    }
  }
  if (currentDrawer) {
    console.log(`${currentDrawer.name} was chosen as the drawer.`);
    sendChatMessageToPlayers(
      `${currentDrawer.name} is now the drawer.`,
      null,
      "blue"
    );
  }
};

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
    if (
      point.options.lineWidth > maxBrushSize ||
      point.options.lineWidth < 1 ||
      point.options.lineCap !== brushStyle.lineCap
    ) {
      // Remove the disallowed line from the drawer's canvas
      sendMessageToPlayer(currentDrawer, "lineHistoryWithRedraw", lineHistory);
      return;
    }
  }
  lineHistory.push(lineData);
  sendMessageToPlayers("lineHistory", lineHistory);
  sendMessageToPlayers("newLineData", lineData, true);
};

const handleCorrectGuess = (guesser) => {
  sendChatMessageToPlayers(
    `${guesser} guessed the word! It was "${currentWord.toLowerCase()}".`,
    null,
    "green"
  );
  sendMessageToPlayers("backgroundColorUpdate", "green");
  startNewRound();
};

const handleUndoline = (sender) => {
  if (sender.ws !== currentDrawer.ws || lineHistory.length == 0) {
    return;
  }
  lineHistory.pop();
  sendMessageToPlayers("lineHistoryWithRedraw", lineHistory);
};

const sendChatMessageToPlayers = (text, sender, className) => {
  const message = { sender: sender, text: text, className: className };
  sendMessageToPlayers("chatMessage", message);
  chatHistory.push(message);
};

const handleChatMessage = (sender, text) => {
  if (text.length > chatMessageMaxLength) {
    return;
  }
  if (
    sender.ws !== currentDrawer.ws &&
    text.toLowerCase() === currentWord.toLowerCase() &&
    !roundIntermission
  ) {
    handleCorrectGuess(sender.name);
  } else {
    sendChatMessageToPlayers(text, sender.name);
  }
};

const startNewRound = async () => {
  roundIntermission = true;
  sendMessageToPlayers("drawerInfoUpdate", roundStartMessage);
  await new Promise((resolve) => setTimeout(resolve, 3000));
  roundIntermission = false;
  if (cancelRound) {
    cancelRound = false;
    return;
  }
  let previousWord;
  if (currentWord) {
    previousWord = currentWord;
    usedWords.push(previousWord);
  }
  if (currentDrawer && !practiceMode) {
    const previousDrawer = currentDrawer;
    previousDrawers.push(previousDrawer);
    sendMessageToPlayer(previousDrawer, "drawerStatusChange", false);
  }
  selectNewDrawer();
  selectNewWord(previousWord);
  sendMessageToPlayer(currentDrawer, "drawerStatusChange", true);
  sendMessageToPlayer(
    currentDrawer,
    "drawerInfoUpdate",
    getDrawerInfoMessage(true)
  );
  sendMessageToPlayers("drawerInfoUpdate", getDrawerInfoMessage(), true);
  if (lineHistory.length > 0) {
    lineHistory = [];
    // Clear all players' canvases
    sendMessageToPlayers("lineHistoryWithRedraw", lineHistory);
  }
  if (roundTimerInterval) {
    clearInterval(roundTimerInterval);
  }
  roundTimeLeft = roundDuration;
  sendMessageToPlayers("roundTimeUpdate", roundTimeLeft);
  roundTimerInterval = setInterval(decrementRoundTimer, 1000);
  sendMessageToPlayers("backgroundColorUpdate", "blue", true);
  sendMessageToPlayer(currentDrawer, "backgroundColorUpdate", "orange");
  playersJoinedDuringRound = [];
};

const startPracticeMode = (player) => {
  practiceMode = true;
  if (roundTimerInterval) {
    clearInterval(roundTimerInterval);
  }
  sendMessageToPlayer(
    player,
    "drawerInfoUpdate",
    "Waiting for other players to join..."
  );
  sendMessageToPlayer(player, "backgroundColorUpdate", "orange");
  if (lineHistory.length > 0) {
    lineHistory = [];
    sendMessageToPlayer(player, "lineHistoryWithRedraw", lineHistory);
  }
  sendMessageToPlayer(player, "roundTimeUpdate", "∞");
  selectNewDrawer(player);
  sendMessageToPlayer(player, "drawerStatusChange", true);
};

const decrementRoundTimer = () => {
  if (!roundIntermission) {
    roundTimeLeft--;
  }
  if (roundTimeLeft < 1) {
    clearInterval(roundTimerInterval);
    console.log("Nobody managed to guess the word. Starting a new round.");
    if (currentWord) {
      sendChatMessageToPlayers(
        `Too bad, nobody guessed the word! It was "${currentWord.toLowerCase()}".`,
        null,
        "red"
      );
    }
    sendMessageToPlayers("backgroundColorUpdate", "red");
    startNewRound();
  }
  sendMessageToPlayers("roundTimeUpdate", roundTimeLeft);
};

const getRandomNumber = (max) => {
  return Math.floor(Math.random() * (max + 1));
};

const getPlayerNameList = () => {
  const names = [];
  joinedPlayers.forEach((player) => {
    names.push(player.name);
  });
  return names;
};

const handleClose = (player) => {
  console.log(`${player.name} has disconnected from the WebSocket server.`);
  let leaveMessage = `${player.name} has left.`;
  let leaveMessageColor = "gray";
  joinedPlayers.forEach((joinedPlayer, index) => {
    if (joinedPlayer.ws === player.ws) {
      joinedPlayers.splice(index, 1);
    }
  });
  if (joinedPlayers.length <= 1) {
    currentDrawer = null;
    currentWord = null;
    previousDrawers = [];
    usedWords = [];
    practiceMode = false;
  }
  if (joinedPlayers.length === 1) {
    if (roundIntermission) {
      cancelRound = true;
    }
    startPracticeMode(joinedPlayers[0]);
  } else if (joinedPlayers.length === 0) {
    if (roundTimerInterval) {
      clearInterval(roundTimerInterval);
    }
    return;
  }
  if (player.ws === currentDrawer.ws && !roundIntermission) {
    console.log("The drawer has left. Starting a new round.");
    startNewRound();
    if (currentDrawer) {
      leaveMessage += ` They were the drawer, so a new round will be started.`;
      leaveMessageColor = "blue";
    }
  }
  sendMessageToPlayers("playerListUpdate", getPlayerNameList());
  sendChatMessageToPlayers(leaveMessage, null, leaveMessageColor);
};

const handleConnection = (player) => {
  nextPlayerNumber++;
  joinedPlayers.push(player);
  playersJoinedDuringRound.push(player);
  sendMessageToPlayer(player, "inputValues", {
    brushStyle: brushStyle,
    chatMessageMaxLength: chatMessageMaxLength,
  });
  console.log(`${player.name} has connected to the WebSocket server.`);
  sendMessageToPlayers("playerListUpdate", getPlayerNameList());
  sendChatMessageToPlayers(`${player.name} has joined.`, null, "gray");
  if (currentDrawer && !practiceMode && !roundIntermission) {
    sendMessageToPlayer(player, "drawerInfoUpdate", getDrawerInfoMessage());
    sendMessageToPlayer(player, "roundTimeUpdate", roundTimeLeft);
    sendMessageToPlayer(player, "backgroundColorUpdate", "blue");
  } else {
    if (practiceMode) {
      startNewRound();
      practiceMode = false;
    } else if (joinedPlayers.length === 1) {
      startPracticeMode(player);
    }
    if (roundIntermission) {
      sendMessageToPlayer(player, "backgroundColorUpdate", "blue");
      sendMessageToPlayer(player, "drawerInfoUpdate", roundStartMessage);
    }
  }
  if (lineHistory.length > 0) {
    sendMessageToPlayer(player, "lineHistoryWithRedraw", lineHistory);
  }
  if (chatHistory.length > 0) {
    sendMessageToPlayer(player, "chatHistory", chatHistory);
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
    case "newLineData":
      handleNewLineData(player, parsedData.data);
      break;
    case "chatMessage":
      handleChatMessage(player, parsedData.data);
      break;
    case "undoLine":
      handleUndoline(player);
      break;
  }
};

server.on("connection", (ws) => {
  const player = { name: `Player ${nextPlayerNumber}`, ws: ws };
  handleConnection(player);
  ws.on("message", (data) => {
    handleMessage(data, player);
  });
  ws.on("close", () => {
    handleClose(player);
  });
});
