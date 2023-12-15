class Player {
  constructor(name, ws) {
    this.name = name;
    this.ws = ws;
  }
  sendMessage(type, value) {
    this.ws?.send(JSON.stringify({ type: type, value: value }));
  }
}

module.exports = { Player };
