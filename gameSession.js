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
}

module.exports = { GameSession };
