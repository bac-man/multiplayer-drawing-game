// Player: used for sending data to an individual player + managing their name

class Player {
  constructor(name, ws) {
    this.name = name;
    this.ws = ws;
    this.nameMaxLength = 20;
  }
  sendMessage(type, value) {
    this.ws?.send(JSON.stringify({ type: type, value: value }));
  }
  checkRequestedNameValidity(requestedName) {
    if (
      !requestedName?.trim() ||
      requestedName.length > this.nameMaxLength ||
      requestedName
        .toLowerCase()
        .replace(/\s/g, "")
        .match(/player[0-9]/)
    ) {
      return false;
    }
    return true;
  }
}

module.exports = { Player };
