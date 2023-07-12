# multiplayer-drawing-game

A drawing/guessing game that uses React for its front end and WebSockets for player-server communication.

### How to run the game locally

1. Install dependencies by running `npm install`
2. Build the project by running `npm run build`
3. Start the WebSocket and production build servers by running `npm run start`
4. Navigate to the local address specified in the output of `npm run start` (for example, http://192.168.0.104:3000)

If the page does not load on devices other than the host, and/or they cannot connect to the WebSocket server, make sure that the host device's firewall allows inbound connections to the necessary ports (3000 and 3001 by default).

### Environment variables

You can optionally specify the port numbers for the WebSocket and front end servers.
To do this, create a file named `.env` in the root folder of the project.

These are the names of the two environment variables:

`WS_SERVER_PORT` (defaults to 3001 if omitted)

`FRONT_END_SERVER_PORT` (defaults to 3000 if omitted)

For example, to change the WebSocket server port to 3002 and the front end server port to 3003, add these lines to your `.env` file:

```
WS_SERVER_PORT=3002
FRONT_END_SERVER_PORT=3003
```

### Using a custom word list

If you wish to use a custom word list, create a file named `customWordList.json` in the `/data` directory. Add an array containing the desired words to this file.
