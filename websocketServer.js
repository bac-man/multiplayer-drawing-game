const WebSocket = require("ws");
require("dotenv").config();

let wordList;
try {
  wordList = require("./data/customWordList.json");
} catch (e) {
  console.log("Custom word list not found.");
}
if (!wordList || !wordList.length || wordList.length == 0) {
  try {
    wordList = require("./data/wordList.json");
  } catch (e) {
    console.log("Unable to find word list. Exiting.");
    return;
  }
}

const port = process.env.WS_SERVER_PORT || 3001;
const server = new WebSocket.Server({ port: port });
console.log(`\nWebSocket server listening on port ${port}.`);

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
let wordGuessed = false;
let roundCanceled = false;
let roundIntermissionTimeout;
let resolveRoundIntermissionPromise;
const states = Object.freeze({
  PRACTICE_MODE: 1,
  ROUND_IN_PROGRESS: 2,
  ROUND_INTERMISSION: 3,
  NO_PLAYERS: 4,
});
let state = states.NO_PLAYERS;

const roundStartMessage = "A new round will start shortly.";
const chatMessageMaxLength = 50;
const maxBrushSize = 100;
const playerNameMaxLength = 20;
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
    const selectedWord = wordList[Math.floor(Math.random() * wordList.length)];
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
    for (const player of joinedPlayers) {
      if (
        !previousDrawers.includes(player) &&
        !playersJoinedDuringRound.includes(player)
      ) {
        currentDrawer = player;
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
  if (
    sender.ws !== currentDrawer.ws ||
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
      sendMessageToPlayer(currentDrawer, "lineHistoryWithRedraw", lineHistory);
      return;
    }
  }
  lineHistory.push(lineData);
  sendMessageToPlayers("lineHistory", lineHistory);
  sendMessageToPlayers("newLineData", lineData, true);
};

const handleCorrectGuess = (guesser) => {
  wordGuessed = true;
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
    state === states.ROUND_IN_PROGRESS &&
    sender.ws !== currentDrawer.ws &&
    text.toLowerCase() === currentWord.toLowerCase()
  ) {
    handleCorrectGuess(sender.name);
  } else {
    sendChatMessageToPlayers(text, sender.name);
  }
};

const cancelRoundStart = () => {
  roundCanceled = true;
  clearTimeout(roundIntermissionTimeout);
  resolveRoundIntermissionPromise();
};

const startNewRound = async () => {
  if (state === states.ROUND_INTERMISSION) {
    return;
  }
  state = states.ROUND_INTERMISSION;
  clearInterval(roundTimerInterval);
  sendMessageToPlayers("drawerInfoUpdate", roundStartMessage);
  await new Promise((resolve) => {
    resolveRoundIntermissionPromise = resolve;
    roundIntermissionTimeout = setTimeout(resolve, 3000);
  });
  if (roundCanceled) {
    roundCanceled = false;
    return;
  }
  state = states.ROUND_IN_PROGRESS;
  wordGuessed = false;
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
  roundTimeLeft = roundDuration;
  sendMessageToPlayers("roundTimeUpdate", roundTimeLeft);
  roundTimerInterval = setInterval(decrementRoundTimer, 1000);
  sendMessageToPlayers("backgroundColorUpdate", "blue", true);
  sendMessageToPlayer(currentDrawer, "backgroundColorUpdate", "orange");
  playersJoinedDuringRound = [];
};

const startPracticeMode = (player) => {
  state = states.PRACTICE_MODE;
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
  roundTimeLeft--;
  sendMessageToPlayers("roundTimeUpdate", roundTimeLeft);
  if (roundTimeLeft < 1) {
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
};

const getPlayerNameList = () => {
  const names = [];
  joinedPlayers.forEach((player) => {
    names.push(player.name);
  });
  return names;
};

const handleNameChangeRequest = (player, requestedName) => {
  if (!requestedName.trim()) {
    return;
  }
  let nameAvailable = true;
  if (requestedName.length > playerNameMaxLength) {
    nameAvailable = false;
  } else {
    for (const joinedPlayer of joinedPlayers) {
      if (joinedPlayer.name.toLowerCase() === requestedName.toLowerCase()) {
        nameAvailable = false;
        break;
      }
    }
  }
  if (nameAvailable) {
    sendChatMessageToPlayers(
      `${player.name} changed their name to ${requestedName}.`,
      null,
      "gray"
    );
    player.name = requestedName;
    sendMessageToPlayers("playerListUpdate", getPlayerNameList());
    sendMessageToPlayers("drawerInfoUpdate", getDrawerInfoMessage(), true);
    sendMessageToPlayer(player, "nameChangeStatus", {
      success: true,
      message: "Your name has been changed.",
    });
  } else {
    sendMessageToPlayer(player, "nameChangeStatus", {
      success: false,
      message: "That name is unavailable. Please choose another name.",
    });
  }
};

const handleClose = (player) => {
  console.log(`${player.name} has disconnected from the WebSocket server.`);
  let leaveMessage = `${player.name} has left.`;
  let leaveMessageColor = "gray";
  sendChatMessageToPlayers(leaveMessage, null, leaveMessageColor);
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
  }
  if (joinedPlayers.length === 1) {
    if (state === states.ROUND_INTERMISSION) {
      cancelRoundStart();
    }
    startPracticeMode(joinedPlayers[0]);
  } else if (joinedPlayers.length === 0) {
    state = states.NO_PLAYERS;
    if (roundTimerInterval) {
      clearInterval(roundTimerInterval);
    }
    chatHistory.push({
      sender: null,
      text: leaveMessage,
      className: leaveMessageColor,
    });
    return;
  }
  if (player.ws === currentDrawer.ws && state !== states.ROUND_INTERMISSION) {
    const drawerLeaveMessage = "The drawer has left. Starting a new round.";
    console.log(drawerLeaveMessage);
    if (currentDrawer) {
      leaveMessageColor = "blue";
      sendChatMessageToPlayers(drawerLeaveMessage, null, leaveMessageColor);
    }
    startNewRound();
  }
  sendMessageToPlayers("playerListUpdate", getPlayerNameList());
};

const handleConnection = (player) => {
  nextPlayerNumber++;
  joinedPlayers.push(player);
  playersJoinedDuringRound.push(player);
  sendMessageToPlayer(player, "inputValues", {
    brushStyle: brushStyle,
    chatMessageMaxLength: chatMessageMaxLength,
    playerNameMaxLength: playerNameMaxLength,
  });
  console.log(`${player.name} has connected to the WebSocket server.`);
  sendMessageToPlayers("playerListUpdate", getPlayerNameList());
  sendChatMessageToPlayers(`${player.name} has joined.`, null, "gray");

  switch (state) {
    case states.NO_PLAYERS:
      startPracticeMode(player);
      break;
    case states.PRACTICE_MODE:
      startNewRound();
      break;
    case states.ROUND_IN_PROGRESS:
      sendMessageToPlayer(player, "drawerInfoUpdate", getDrawerInfoMessage());
      sendMessageToPlayer(player, "roundTimeUpdate", roundTimeLeft);
      break;
    case states.ROUND_INTERMISSION:
      sendMessageToPlayer(player, "drawerInfoUpdate", roundStartMessage);
      break;
  }

  if (state !== states.PRACTICE_MODE) {
    let bgColor = "blue";
    if (wordGuessed) {
      bgColor = "green";
    } else if (state === states.ROUND_INTERMISSION && roundTimeLeft === 0) {
      bgColor = "red";
    }
    sendMessageToPlayer(player, "backgroundColorUpdate", bgColor);
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
    case "nameChangeRequest":
      handleNameChangeRequest(player, parsedData.data);
      break;
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
