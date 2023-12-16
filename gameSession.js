class GameSession {
  constructor() {
    if (GameSession._instance) {
      throw new Error(
        "The singleton class GameSession can only be instantiated once."
      );
    }
    GameSession._instance = this;
    this.players = [];
  }
  messagePlayers(type, value, excludedPlayer = null) {
    this.players.forEach((player) => {
      if (!excludedPlayer || excludedPlayer !== player) {
        player.sendMessage(type, value);
      }
    });
  }
}

module.exports = { GameSession };
