const WebSocket = require("ws");
let wordList;
try {
  wordList = require("./data/wordList.json");
} catch (e) {
  console.log("Unable to find word list. Exiting.");
  return;
}

const port = 3001;
const server = new WebSocket.Server({ port: port });
console.log(`WebSocket server listening on port ${port}`);

const joinedPlayers = [];
let lineHistory = [];
let chatHistory = [];
let currentDrawer;
let nextPlayerNumber = 1;
let currentWord;
let usedWords = [];
let previousDrawers = [];
const roundDuration = 60;
let roundTimeLeft;
let roundTimerInterval;
let roundIntermission = false;

const sendMessageToPlayers = (type, data, excludeCurrentDrawer = false) => {
  joinedPlayers.forEach((player) => {
    if (
      !excludeCurrentDrawer ||
      (excludeCurrentDrawer && player.ws !== currentDrawer.ws)
    ) {
      player?.ws?.send(JSON.stringify({ type: type, data: data }));
    }
  });
};

const sendMessageToPlayer = (player, type, data) => {
  player?.ws?.send(JSON.stringify({ type: type, data: data }));
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

const selectNewDrawer = () => {
  let newDrawerSelected = false;
  for (const joinedPlayer of joinedPlayers) {
    if (!previousDrawers.includes(joinedPlayer)) {
      currentDrawer = joinedPlayer;
      newDrawerSelected = true;
      break;
    }
  }
  if (!newDrawerSelected) {
    previousDrawers = [];
    currentDrawer = joinedPlayers[0];
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
    // If the max size is changed here, it should also be changed
    // in gameContainer.jsx accordingly
    if (
      point.options.lineWidth > 100 ||
      point.options.lineWidth < 1 ||
      point.options.lineCap !== "round"
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
  sendMessageToPlayers("roundEnd", "green");
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
  // If the max length is changed here, it should also be changed
  // in chatbox.jsx accordingly
  if (text.length > 50) {
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

const startNewRound = async (intermissionTimer = true) => {
  if (joinedPlayers.length == 0) {
    currentDrawer = null;
    currentWord = null;
    previousDrawers = [];
    usedWords = [];
    return;
  }

  if (intermissionTimer) {
    roundIntermission = true;
    await new Promise((resolve) => setTimeout(resolve, 3000));
    roundIntermission = false;
  }

  let previousWord;
  if (currentWord) {
    previousWord = currentWord;
    usedWords.push(previousWord);
  }
  if (currentDrawer) {
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
  sendMessageToPlayers("roundStart", null);
};

const decrementRoundTimer = () => {
  if (!roundIntermission) {
    roundTimeLeft--;
  }
  if (roundTimeLeft < 1) {
    clearInterval(roundTimerInterval);
    console.log("Nobody managed to guess the word. Starting a new round.");
    sendChatMessageToPlayers(
      `Too bad, nobody guessed the word! It was "${currentWord.toLowerCase()}".`,
      null,
      "red"
    );
    sendMessageToPlayers("roundEnd", "red");
    startNewRound();
  }
  sendMessageToPlayers("roundTimeUpdate", roundTimeLeft);
};

const getRandomNumber = (max) => {
  return Math.floor(Math.random() * (max + 1));
};

server.on("connection", (ws) => {
  const player = { name: `Player ${nextPlayerNumber}`, ws: ws };
  nextPlayerNumber++;
  joinedPlayers.push(player);
  console.log(`${player.name} has connected to the WebSocket server.`);
  sendChatMessageToPlayers(`${player.name} has joined.`, null, "gray");
  if (currentDrawer) {
    sendMessageToPlayer(player, "drawerInfoUpdate", getDrawerInfoMessage());
  } else {
    startNewRound(false);
  }
  if (lineHistory.length > 0) {
    sendMessageToPlayer(player, "lineHistoryWithRedraw", lineHistory);
  }
  if (chatHistory.length > 0) {
    sendMessageToPlayer(player, "chatHistory", chatHistory);
  }
  sendMessageToPlayer(player, "roundTimeUpdate", roundTimeLeft);
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
      case "undoLine":
        handleUndoline(player);
        break;
    }
  });
  ws.on("close", () => {
    console.log(`${player.name} has disconnected from the WebSocket server.`);
    let leaveMessage = `${player.name} has left.`;
    let leaveMessageColor = "gray";
    joinedPlayers.forEach((player, index) => {
      if (player.ws === ws) {
        joinedPlayers.splice(index, 1);
      }
    });
    if (player.ws === currentDrawer.ws && !roundIntermission) {
      console.log("The drawer has left. Starting a new round.");
      startNewRound();
      if (currentDrawer) {
        leaveMessage += ` They were the drawer, so a new round will be started.`;
        leaveMessageColor = "blue";
      }
    }
    sendChatMessageToPlayers(leaveMessage, null, leaveMessageColor);
  });
});
