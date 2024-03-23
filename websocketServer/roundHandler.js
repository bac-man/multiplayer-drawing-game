const { states } = require("./gameStates");

let wordList;
try {
  wordList = require("./data/customWordList.json");
} catch (e) {
  console.log("Custom word list not found.");
}
if (!wordList || !wordList.length || wordList.length == 0) {
  try {
    wordList = require("../data/wordList.json");
  } catch (e) {
    console.log("Unable to find word list. Exiting.");
    return;
  }
}

// RoundHandler: used for managing round-related data + starting, canceling and ending rounds

class RoundHandler {
  constructor(session) {
    if (RoundHandler._instance) {
      throw new Error(
        "The singleton class RoundHandler can only be instantiated once."
      );
    }
    RoundHandler._instance = this;
    this.session = session;
    this.startMessage = "A new round will start shortly.";
    this.lineHistory = [];
    this.currentDrawer;
    this.lateJoiners = [];
    this.currentWord;
    this.usedWords = [];
    this.previousDrawers = [];
    this.duration = 60;
    this.timeLeft;
    this.timerInterval;
    this.wordGuessed = false;
    this.startCanceled = false;
    this.intermissionTimeout;
    this.resolveIntermissionPromise;
    this.state = states.NO_PLAYERS;
    this.timerRunning = false;
  }

  decrementTimer() {
    this.timeLeft--;
    this.session.messagePlayers("roundTimeUpdate", this.timeLeft);
    if (this.timeLeft < 1) {
      console.log("Nobody managed to guess the word. Starting a new round.");
      if (this.currentWord) {
        this.session.sendChatMessageToPlayers(
          `Too bad, nobody guessed the word! It was "${this.currentWord.toLowerCase()}".`,
          null,
          "red"
        );
      }
      this.session.messagePlayers("backgroundColorUpdate", "red");
      this.startNew();
    }
  }

  stopTimer() {
    clearInterval(this.timerInterval);
    this.timerRunning = false;
  }

  async startNew() {
    let exitingPracticeMode = false;
    if (this.state === states.ROUND_INTERMISSION) {
      return;
    } else if (this.state === states.PRACTICE_MODE) {
      exitingPracticeMode = true;
    }
    this.state = states.ROUND_INTERMISSION;

    clearInterval(this.timerInterval);

    this.session.messagePlayers("drawerInfoUpdate", this.startMessage);
    await new Promise((resolve) => {
      this.resolveIntermissionPromise = resolve;
      this.intermissionTimeout = setTimeout(resolve, 3000);
    });
    if (this.startCanceled) {
      this.startCanceled = false;
      return;
    }
    this.state = states.ROUND_IN_PROGRESS;
    this.wordGuessed = false;

    let previousWord;
    if (this.currentWord) {
      previousWord = this.currentWord;
      this.usedWords.push(previousWord);
    }
    if (this.currentDrawer) {
      const previousDrawer = this.currentDrawer;
      this.previousDrawers.push(previousDrawer);
      if (!exitingPracticeMode) {
        previousDrawer.sendMessage("drawerStatusChange", false);
      }
    }

    this.selectNewDrawer();
    this.selectNewWord(previousWord);
    this.currentDrawer.sendMessage("drawerStatusChange", true);
    this.currentDrawer.sendMessage(
      "drawerInfoUpdate",
      this.getDrawerInfoMessage(true)
    );
    this.session.messagePlayers(
      "drawerInfoUpdate",
      this.getDrawerInfoMessage(),
      this.currentDrawer
    );
    if (this.lineHistory.length > 0) {
      this.lineHistory = [];
      // Clear all players' canvases
      this.session.messagePlayers("lineHistoryWithRedraw", this.lineHistory);
    }
    this.timeLeft = this.duration;
    this.session.messagePlayers("roundTimeUpdate", this.timeLeft);
    this.timerInterval = setInterval(this.decrementTimer.bind(this), 1000);
    this.timerRunning = true;
    this.session.messagePlayers(
      "backgroundColorUpdate",
      "blue",
      this.currentDrawer
    );
    this.currentDrawer.sendMessage("backgroundColorUpdate", "orange");
    this.lateJoiners = [];
  }

  selectNewDrawer(practiceModeDrawer = null) {
    if (practiceModeDrawer) {
      this.currentDrawer = practiceModeDrawer;
    } else {
      let newDrawerSelected = false;
      for (const player of this.session.players) {
        if (
          !this.previousDrawers.includes(player) &&
          !this.lateJoiners.includes(player)
        ) {
          this.currentDrawer = player;
          newDrawerSelected = true;
          break;
        }
      }
      if (!newDrawerSelected) {
        this.previousDrawers = [];
        this.currentDrawer = this.session.players[0];
      }
    }
    if (this.currentDrawer) {
      let message;
      if (practiceModeDrawer) {
        message = `${this.currentDrawer.name} is now practicing alone.`;
      } else {
        message = `${this.currentDrawer.name} is now the drawer.`;
      }
      console.log(message);
      this.session.sendChatMessageToPlayers(message, null, "blue");
    }
  }

  selectNewWord(previousWord = null) {
    if (this.usedWords.length == wordList.length) {
      this.usedWords = [];
    }
    let newWordSelected = false;
    while (!newWordSelected) {
      const selectedWord =
        wordList[Math.floor(Math.random() * wordList.length)];
      if (
        !this.usedWords.includes(selectedWord) &&
        selectedWord !== previousWord
      ) {
        this.currentWord = selectedWord;
        newWordSelected = true;
      }
    }
    if (this.currentWord) {
      console.log(`"${this.currentWord}" was chosen as the word.`);
    }
  }

  handleNewPlayer(player) {
    switch (this.state) {
      case states.NO_PLAYERS:
        this.startSoloPractice(player);
        break;
      case states.PRACTICE_MODE:
        this.startNew();
        break;
      case states.ROUND_IN_PROGRESS:
        player.sendMessage("drawerInfoUpdate", this.getDrawerInfoMessage());
        player.sendMessage("roundTimeUpdate", this.timeLeft);
        break;
      case states.ROUND_INTERMISSION:
        player.sendMessage("drawerInfoUpdate", this.startMessage);
        break;
    }
    if (this.state !== states.PRACTICE_MODE) {
      let bgColor = "blue";
      if (this.wordGuessed) {
        bgColor = "green";
      } else if (
        this.state === states.ROUND_INTERMISSION &&
        this.timeLeft === 0
      ) {
        bgColor = "red";
      }
      player.sendMessage("backgroundColorUpdate", bgColor);
    }
    if (this.lineHistory.length > 0) {
      player.sendMessage("lineHistoryWithRedraw", this.lineHistory);
    }
  }

  handleLeavingPlayer(player) {
    const remainingPlayerCount = this.session.players.length;
    if (remainingPlayerCount <= 1) {
      this.currentDrawer = null;
      this.currentWord = null;
      this.previousDrawers = [];
      this.usedWords = [];
    }
    if (remainingPlayerCount === 1) {
      if (this.state === states.ROUND_INTERMISSION) {
        this.cancelStart();
      }
      this.startSoloPractice(this.session.players[0]);
    } else if (remainingPlayerCount === 0) {
      this.state = states.NO_PLAYERS;
      if (this.timerRunning) {
        this.stopTimer();
      }
      return;
    }
    if (
      player === this.currentDrawer &&
      this.state !== states.ROUND_INTERMISSION
    ) {
      const drawerLeaveMessage = "The drawer has left. Starting a new round.";
      console.log(drawerLeaveMessage);
      if (this.currentDrawer) {
        this.session.sendChatMessageToPlayers(drawerLeaveMessage, null, "blue");
      }
      this.startNew();
    }
  }

  startSoloPractice(player) {
    this.state = states.PRACTICE_MODE;
    if (this.timerRunning) {
      this.stopTimer();
    }
    player.sendMessage(
      "drawerInfoUpdate",
      "Waiting for other players to join..."
    );
    player.sendMessage("backgroundColorUpdate", "orange");
    if (this.lineHistory.length > 0) {
      this.lineHistory = [];
      player.sendMessage("lineHistoryWithRedraw", this.lineHistory);
    }
    player.sendMessage("roundTimeUpdate", "∞");
    this.selectNewDrawer(player);
    player.sendMessage("drawerStatusChange", true);
  }

  getDrawerInfoMessage(playerIsDrawer = false) {
    return playerIsDrawer
      ? `You are the drawer. The word is "${this.currentWord.toLowerCase()}".`
      : `${this.currentDrawer?.name} is drawing.`;
  }

  handleCorrectGuess(guesser) {
    this.wordGuessed = true;
    this.session.sendChatMessageToPlayers(
      `${guesser} guessed the word! It was "${this.currentWord.toLowerCase()}".`,
      null,
      "green"
    );
    this.session.messagePlayers("backgroundColorUpdate", "green");
    this.startNew();
  }

  cancelStart() {
    this.startCanceled = true;
    clearTimeout(this.intermissionTimeout);
    this.resolveIntermissionPromise();
  }
}

module.exports = { RoundHandler };
