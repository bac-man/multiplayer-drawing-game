import { useEffect, useReducer, useRef, useState } from "react";
import Chatbox from "../chatbox/chatbox";
import RoundInfo from "../roundInfo/roundInfo";
import GameCanvas from "../gameCanvas/gameCanvas";
import BrushOptions from "../brushOptions/brushOptions";
import style from "./gameContainer.module.scss";

const GameContainer = () => {
  // If the max size is changed here, it should also be changed
  // in webSocketServer.js accordingly
  const maxBrushSize = 100;
  const [brushStyle, setBrushStyle] = useState({
    lineWidth: parseInt(maxBrushSize * 0.333),
    lineCap: "round",
    strokeStyle: "#000000",
  });

  const [connectionInfoMessage, setConnectionInfoMessage] = useState(
    "Connecting to the game server..."
  );
  const [drawingAllowed, setDrawingAllowed] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [roundEndGradientColor, setRoundEndGradientColor] = useState("");
  const [roundEndGradientVisible, setRoundEndGradientVisible] = useState(false);
  const [drawerInfo, setDrawerInfo] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [messages, setMessages] = useState([]);
  const messagesRef = useRef([]);
  const lineHistoryRef = useRef([]);
  const wsRef = useRef();
  const canvasRef = useRef();

  useEffect(() => {
    wsRef.current = new WebSocket("ws://192.168.0.104:3001");
    const ws = wsRef.current;
    ws.addEventListener("error", handleError);
    ws.addEventListener("open", handleOpen);
    ws.addEventListener("message", handleMessage);
    ws.addEventListener("close", handleClose);
    return () => {
      ws.removeEventListener("error", handleError);
      ws.removeEventListener("open", handleOpen);
      ws.removeEventListener("message", handleMessage);
      ws.removeEventListener("close", handleClose);
    };
  }, []);

  useEffect(() => {
    if (!drawingAllowed) {
      setSelectedTab(0);
    }
  }, [drawingAllowed]);

  const handleError = () => {
    setConnectionInfoMessage(
      "Unable to connect to the game server. Please try again later."
    );
  };

  const handleOpen = () => {
    setConnectionInfoMessage("");
  };

  const handleMessage = (message) => {
    const parsedData = JSON.parse(message.data);
    switch (parsedData.type) {
      case "chatHistory":
        messagesRef.current = parsedData.data;
        setMessages(parsedData.data);
        break;
      case "chatMessage":
        const messageData = parsedData.data;
        addNewChatMessage(
          messageData.text,
          messageData.sender,
          messageData.className
        );
        break;
      case "drawerInfoUpdate":
        setDrawerInfo(parsedData.data);
        break;
      case "drawerStatusChange":
        setDrawingAllowed(parsedData.data);
        break;
      case "lineHistory":
        lineHistoryRef.current = parsedData.data;
        break;
      case "lineHistoryWithRedraw":
        lineHistoryRef.current = parsedData.data;
        canvasRef.current.dispatchEvent(new CustomEvent("redraw"));
        break;
      case "newLineData":
        canvasRef.current.dispatchEvent(
          new CustomEvent("newLine", { detail: parsedData.data })
        );
        break;
      case "roundEnd":
        setRoundEndGradientColor(parsedData.data);
        setRoundEndGradientVisible(true);
        break;
      case "roundStart":
        setRoundEndGradientVisible(false);
        break;
      case "roundTimeUpdate":
        setTimeLeft(parsedData.data);
        break;
    }
  };

  const handleClose = () => {
    setConnectionInfoMessage("The connection to the game server was closed.");
  };

  const sendNewLineData = (linePoints) => {
    wsRef.current.send(
      JSON.stringify({
        type: "newLineData",
        data: linePoints,
      })
    );
  };

  const undoLine = () => {
    wsRef.current.send(JSON.stringify({ type: "undoLine" }));
  };

  const sendChatMessage = (inputElement) => {
    const message = inputElement.value.trim();
    if (message) {
      wsRef.current.send(
        JSON.stringify({ type: "chatMessage", data: message })
      );
    }
    inputElement.value = "";
  };

  const addNewChatMessage = (text, sender, className) => {
    // Update the messages state via ref to avoid missing messages when multiple
    // are received in a short timespan (state updates are not synchronous/instant)
    messagesRef.current.push({
      sender: sender,
      text: text,
      className: className,
    });
    setMessages([...messagesRef.current]);
  };

  return (
    <div className={style.gameContainer}>
      <div
        className={`${style.drawingModeGradient} ${
          drawingAllowed ? "" : style.hidden
        }`}
      />
      <div
        className={`${style.roundEndGradient} ${style[roundEndGradientColor]} ${
          roundEndGradientVisible ? "" : style.hidden
        }`}
      />
      <RoundInfo drawerInfo={drawerInfo} timeLeft={timeLeft} />
      <div className={style.controls}>
        <GameCanvas
          canvasRef={canvasRef}
          brushStyle={brushStyle}
          drawingAllowed={drawingAllowed}
          sendNewLineData={sendNewLineData}
          lineHistoryRef={lineHistoryRef}
        />
        <div className={style.tabs}>
          <Chatbox
            messages={messages}
            sendChatMessage={sendChatMessage}
            isHidden={selectedTab !== 0}
          />
          <BrushOptions
            isHidden={selectedTab !== 1}
            brushStyle={brushStyle}
            setBrushStyle={setBrushStyle}
            drawingAllowed={drawingAllowed}
            maxBrushSize={maxBrushSize}
            undoLine={undoLine}
          />
          <div className={style.tabButtons}>
            <button
              onClick={() => {
                setSelectedTab(0);
              }}
              className={`${selectedTab === 0 ? style.selected : ""}`}
            >
              Chat
            </button>
            <button
              onClick={() => {
                setSelectedTab(1);
              }}
              className={`${selectedTab === 1 ? style.selected : ""}`}
              disabled={!drawingAllowed}
            >
              Drawing tools
            </button>
          </div>
        </div>
      </div>
      <div
        className={`${style.connectionInfoMessage} ${
          connectionInfoMessage ? "" : style.hidden
        }`}
      >
        <span>{connectionInfoMessage}</span>
      </div>
    </div>
  );
};

export default GameContainer;
