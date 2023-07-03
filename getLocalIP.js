const interfaces = require("os").networkInterfaces();

const getLocalIP = () => {
  for (const deviceName in interfaces) {
    const networkInterface = interfaces[deviceName];
    for (let i = 0; i < networkInterface.length; i++) {
      const alias = networkInterface[i];
      if (
        alias.family === "IPv4" &&
        alias.address !== "127.0.0.1" &&
        !alias.internal
      ) {
        return alias.address;
      }
    }
  }
};

module.exports = { getLocalIP };
