const express = require("express");
const { getLocalIP } = require("./getLocalIP.js");
require("dotenv").config();

const server = express();
const port = process.env.FRONT_END_SERVER_PORT || 3000;

server.listen(port, () => {
  console.log(
    `\nFront end server running. Navigate to http://${getLocalIP()}:${port} to play the game.\n`
  );
  server.use(express.static(`${__dirname}/dist`));
});
