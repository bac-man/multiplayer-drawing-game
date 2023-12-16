const WebSocket = require("ws");
const { Player } = require("./player");
const { GameSession } = require("./gameSession");
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

const session = new GameSession();
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
const brushStyle = {
  lineWidth: parseInt(maxBrushSize / 3),
  lineCap: "round",
  strokeStyle: "#000000",
  maxBrushSize: maxBrushSize,
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

const selectNewDrawer = (practiceModeDrawer = null) => {
  if (practiceModeDrawer) {
    currentDrawer = practiceModeDrawer;
  } else {
    let newDrawerSelected = false;
    for (const player of session.players) {
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
      currentDrawer = session.players[0];
    }
  }
  if (currentDrawer) {
    let message;
    if (practiceModeDrawer) {
      message = `${currentDrawer.name} is now practicing alone.`;
    } else {
      message = `${currentDrawer.name} is now the drawer.`;
    }
    console.log(message);
    sendChatMessageToPlayers(message, null, "blue");
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
      currentDrawer.sendMessage("lineHistoryWithRedraw", lineHistory);
      return;
    }
  }
  lineHistory.push(lineData);
  session.messagePlayers("lineHistory", lineHistory);
  session.messagePlayers("newLineData", lineData, currentDrawer);
};

const handleCorrectGuess = (guesser) => {
  wordGuessed = true;
  sendChatMessageToPlayers(
    `${guesser} guessed the word! It was "${currentWord.toLowerCase()}".`,
    null,
    "green"
  );
  session.messagePlayers("backgroundColorUpdate", "green");
  startNewRound();
};

const handleUndoDrawing = (sender, clearAll) => {
  if (sender.ws !== currentDrawer.ws || lineHistory.length == 0) {
    return;
  }
  if (clearAll) {
    lineHistory = [];
  } else {
    lineHistory.pop();
  }
  session.messagePlayers("lineHistoryWithRedraw", lineHistory);
};

const sendChatMessageToPlayers = (text, sender, className) => {
  const message = { sender: sender, text: text, className: className };
  session.messagePlayers("chatMessage", message);
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
  let exitingPracticeMode = false;
  if (state === states.ROUND_INTERMISSION) {
    return;
  } else if (state === states.PRACTICE_MODE) {
    exitingPracticeMode = true;
  }
  state = states.ROUND_INTERMISSION;
  clearInterval(roundTimerInterval);
  session.messagePlayers("drawerInfoUpdate", roundStartMessage);
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
    if (!exitingPracticeMode) {
      previousDrawer.sendMessage("drawerStatusChange", false);
    }
  }
  selectNewDrawer();
  selectNewWord(previousWord);
  currentDrawer.sendMessage("drawerStatusChange", true);
  currentDrawer.sendMessage("drawerInfoUpdate", getDrawerInfoMessage(true));
  session.messagePlayers(
    "drawerInfoUpdate",
    getDrawerInfoMessage(),
    currentDrawer
  );
  if (lineHistory.length > 0) {
    lineHistory = [];
    // Clear all players' canvases
    session.messagePlayers("lineHistoryWithRedraw", lineHistory);
  }
  roundTimeLeft = roundDuration;
  session.messagePlayers("roundTimeUpdate", roundTimeLeft);
  roundTimerInterval = setInterval(decrementRoundTimer, 1000);
  session.messagePlayers("backgroundColorUpdate", "blue", currentDrawer);
  currentDrawer.sendMessage("backgroundColorUpdate", "orange");
  playersJoinedDuringRound = [];
};

const startPracticeMode = (player) => {
  state = states.PRACTICE_MODE;
  if (roundTimerInterval) {
    clearInterval(roundTimerInterval);
  }
  player.sendMessage(
    "drawerInfoUpdate",
    "Waiting for other players to join..."
  );
  player.sendMessage("backgroundColorUpdate", "orange");
  if (lineHistory.length > 0) {
    lineHistory = [];
    player.sendMessage("lineHistoryWithRedraw", lineHistory);
  }
  player.sendMessage("roundTimeUpdate", "∞");
  selectNewDrawer(player);
  player.sendMessage("drawerStatusChange", true);
};

const decrementRoundTimer = () => {
  roundTimeLeft--;
  session.messagePlayers("roundTimeUpdate", roundTimeLeft);
  if (roundTimeLeft < 1) {
    console.log("Nobody managed to guess the word. Starting a new round.");
    if (currentWord) {
      sendChatMessageToPlayers(
        `Too bad, nobody guessed the word! It was "${currentWord.toLowerCase()}".`,
        null,
        "red"
      );
    }
    session.messagePlayers("backgroundColorUpdate", "red");
    startNewRound();
  }
};

const getPlayerNameList = () => {
  const names = [];
  session.players.forEach((player) => {
    names.push(player.name);
  });
  return names;
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
    sendChatMessageToPlayers(
      `${player.name} changed their name to ${requestedName}.`,
      null,
      "gray"
    );
    player.name = requestedName;
    session.messagePlayers("playerListUpdate", getPlayerNameList());
    session.messagePlayers(
      "drawerInfoUpdate",
      getDrawerInfoMessage(),
      currentDrawer
    );
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
  sendChatMessageToPlayers(`${player.name} has left.`, null, "gray");
  session.players.forEach((joinedPlayer, index) => {
    if (joinedPlayer.ws === player.ws) {
      session.players.splice(index, 1);
    }
  });
  if (session.players.length <= 1) {
    currentDrawer = null;
    currentWord = null;
    previousDrawers = [];
    usedWords = [];
  }
  if (session.players.length === 1) {
    if (state === states.ROUND_INTERMISSION) {
      cancelRoundStart();
    }
    startPracticeMode(session.players[0]);
  } else if (session.players.length === 0) {
    state = states.NO_PLAYERS;
    if (roundTimerInterval) {
      clearInterval(roundTimerInterval);
    }
    return;
  }
  if (player.ws === currentDrawer.ws && state !== states.ROUND_INTERMISSION) {
    const drawerLeaveMessage = "The drawer has left. Starting a new round.";
    console.log(drawerLeaveMessage);
    if (currentDrawer) {
      sendChatMessageToPlayers(drawerLeaveMessage, null, "blue");
    }
    startNewRound();
  }
  session.messagePlayers("playerListUpdate", getPlayerNameList());
};

const handleConnection = (player) => {
  nextPlayerNumber++;
  session.players.push(player);

  playersJoinedDuringRound.push(player);
  player.sendMessage("inputValues", {
    brushStyle: brushStyle,
    chatMessageMaxLength: chatMessageMaxLength,
    playerNameMaxLength: player.nameMaxLength,
  });
  console.log(`${player.name} has connected to the WebSocket server.`);
  session.messagePlayers("playerListUpdate", getPlayerNameList());
  sendChatMessageToPlayers(`${player.name} has joined.`, null, "gray");

  switch (state) {
    case states.NO_PLAYERS:
      startPracticeMode(player);
      break;
    case states.PRACTICE_MODE:
      startNewRound();
      break;
    case states.ROUND_IN_PROGRESS:
      player.sendMessage("drawerInfoUpdate", getDrawerInfoMessage());
      player.sendMessage("roundTimeUpdate", roundTimeLeft);
      break;
    case states.ROUND_INTERMISSION:
      player.sendMessage("drawerInfoUpdate", roundStartMessage);
      break;
  }

  if (state !== states.PRACTICE_MODE) {
    let bgColor = "blue";
    if (wordGuessed) {
      bgColor = "green";
    } else if (state === states.ROUND_INTERMISSION && roundTimeLeft === 0) {
      bgColor = "red";
    }
    player.sendMessage("backgroundColorUpdate", bgColor);
  }

  if (lineHistory.length > 0) {
    player.sendMessage("lineHistoryWithRedraw", lineHistory);
  }
  if (chatHistory.length > 0) {
    player.sendMessage("chatHistory", chatHistory);
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
