const WebSocket = require("ws");

const port = 3001;
const server = new WebSocket.Server({ port: port });
console.log(`WebSocket server listening on port ${port}`);

const joinedPlayers = [];
let lineHistory = [];
let chatHistory = [];
let currentDrawer;
let nextPlayerNumber = 1;
const wordList = ["House", "Car", "Flower", "Star"];
let currentWord;
let usedWords = [];
let previousDrawers = [];

const sendMessageToPlayers = (type, data, excludeCurrentDrawer = false) => {
  joinedPlayers.forEach((player) => {
    if (
      !excludeCurrentDrawer ||
      (excludeCurrentDrawer && player.ws !== currentDrawer.ws)
    ) {
      player.ws.send(JSON.stringify({ type: type, data: data }));
    }
  });
};

const sendMessageToPlayer = (player, type, data) => {
  player.ws.send(JSON.stringify({ type: type, data: data }));
};

const getDrawerInfoMessage = (playerIsDrawer = false) => {
  return playerIsDrawer
    ? `You are the drawer. The word is "${currentWord.toLowerCase()}".`
    : `${currentDrawer.name} is drawing.`;
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
  console.log(`"${currentWord}" was chosen as the word.`);
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
  console.log(`${currentDrawer.name} was chosen as the drawer.`);
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
  }
  lineHistory.push(lineData);
  sendMessageToPlayers("lineHistory", lineHistory);
  sendMessageToPlayers("newLineData", lineData, true);
};

const handleCorrectGuess = (guesser) => {
  const message = {
    text: `${guesser} guessed the word! It was "${currentWord.toLowerCase()}".`,
  };
  sendMessageToPlayers("chatMessage", message);
  chatHistory.push(message);

  const previousWord = currentWord;
  usedWords.push(currentWord);
  selectNewWord(previousWord);

  const previousDrawer = currentDrawer;
  previousDrawers.push(previousDrawer);
  selectNewDrawer();

  sendMessageToPlayer(previousDrawer, "drawerStatusChange", false);
  sendMessageToPlayer(currentDrawer, "drawerStatusChange", true);
  sendMessageToPlayer(
    currentDrawer,
    "drawerInfoUpdate",
    getDrawerInfoMessage(true)
  );

  lineHistory = [];

  // Clear all players' canvases
  sendMessageToPlayers("lineHistoryWithRedraw", lineHistory);
  sendMessageToPlayers("drawerInfoUpdate", getDrawerInfoMessage(), true);
};

const handleChatMessage = (sender, text) => {
  if (
    sender.ws !== currentDrawer.ws &&
    text.toLowerCase() === currentWord.toLowerCase()
  ) {
    handleCorrectGuess(sender.name);
  } else {
    const message = { sender: sender.name, text: text };
    sendMessageToPlayers("chatMessage", message);
    chatHistory.push(message);
  }
};

const getRandomNumber = (max) => {
  return Math.floor(Math.random() * (max + 1));
};

server.on("connection", (ws) => {
  const player = { name: `Player ${nextPlayerNumber}`, ws: ws };
  nextPlayerNumber++;
  joinedPlayers.push(player);
  console.log(`${player.name} has connected to the WebSocket server.`);
  if (currentDrawer) {
    sendMessageToPlayer(player, "drawerInfoUpdate", getDrawerInfoMessage());
  } else {
    selectNewDrawer();
    selectNewWord();
    sendMessageToPlayer(currentDrawer, "drawerStatusChange", true);
    sendMessageToPlayer(
      currentDrawer,
      "drawerInfoUpdate",
      getDrawerInfoMessage(true)
    );
    sendMessageToPlayers("drawerInfoUpdate", getDrawerInfoMessage(), true);
  }
  if (lineHistory.length > 0) {
    sendMessageToPlayer(player, "lineHistoryWithRedraw", lineHistory);
  }
  if (chatHistory.length > 0) {
    sendMessageToPlayer(player, "chatHistory", chatHistory);
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
