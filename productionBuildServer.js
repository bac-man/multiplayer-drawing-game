const express = require("express");
require("dotenv").config();

const server = express();

const port = process.env.FRONT_END_SERVER_PORT || 3000;

server.listen(port, () => {
  console.log(`Production build server listening on port ${port}`);
  server.use(express.static(`${__dirname}/dist`));
});
