// GameSession: used for storing chat messages, managing players and broadcasting data to them

class GameSession {
  constructor() {
    if (GameSession._instance) {
      throw new Error(
        "The singleton class GameSession can only be instantiated once."
      );
    }
    GameSession._instance = this;
    this.players = [];
    this.chatHistory = [];
  }

  messagePlayers(type, value, excludedPlayer = null) {
    this.players.forEach((player) => {
      if (!excludedPlayer || excludedPlayer !== player) {
        player.sendMessage(type, value);
      }
    });
  }

  sendChatMessageToPlayers(text, sender, className) {
    const message = { sender: sender, text: text, className: className };
    this.messagePlayers("chatMessage", message);
    this.chatHistory.push(message);
  }

  findAllPlayerNames() {
    const names = [];
    this.players.forEach((player) => {
      names.push(player.name);
    });
    return names;
  }

  addPlayer(player) {
    this.players.push(player);
    this.sendChatMessageToPlayers(`${player.name} has joined.`, null, "gray");
    this.messagePlayers("playerListUpdate", this.findAllPlayerNames());
  }

  removePlayer(player) {
    this.players.splice(this.players.indexOf(player), 1);
    this.sendChatMessageToPlayers(`${player.name} has left.`, null, "gray");
    this.messagePlayers("playerListUpdate", this.findAllPlayerNames());
  }
}

module.exports = { GameSession };
