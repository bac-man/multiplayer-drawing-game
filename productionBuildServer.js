const express = require("express");

const server = express();

const port = 3000;

server.listen(port, () => {
  console.log(`Production build server listening on port ${port}`);
  server.use(express.static(`${__dirname}/dist`));
});
