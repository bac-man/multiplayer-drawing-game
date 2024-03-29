import { useEffect, useRef, useState } from "react";
import Chatbox from "../chatbox/chatbox";
import RoundInfo from "../roundInfo/roundInfo";
import GameCanvas from "../gameCanvas/gameCanvas";
import BrushOptions from "../brushOptions/brushOptions";
import style from "./gameContainer.module.scss";
import PlayerList from "../playerList/playerList";
import Tabs from "../tabs/tabs";
import NameChangeModal from "../nameChangeModal/nameChangeModal";

const GameContainer = () => {
  const [brushStyle, setBrushStyle] = useState({});
  const [chatMessageMaxLength, setChatMessageMaxLength] = useState(0);
  const [playerNameMaxLength, setPlayerNameMaxLength] = useState(0);
  const [connectionInfoMessage, setConnectionInfoMessage] = useState(
    "Connecting to the game server..."
  );
  const [drawingAllowed, setDrawingAllowed] = useState(false);
  const [backgroundColorClass, setBackgroundColorClass] = useState("");
  const [drawerInfo, setDrawerInfo] = useState("");
  const [timeLeft, setTimeLeft] = useState("∞");
  const [messages, setMessages] = useState([]);
  const [nameChangeStatus, setNameChangeStatus] = useState({ success: null });
  const [undoButtonsDisabled, setUndoButtonsDisabled] = useState(true);
  // Update the messages and player name list states via refs to avoid missing entries
  // when multiple updates occur in a short timespan (state updates are not synchronous/instant)
  const [playerNames, setPlayerNames] = useState([]);
  const [nameChangeModalOpen, setNameChangeModalOpen] = useState(false);
  const messagesRef = useRef([]);
  const playerNamesRef = useRef([]);
  const lineHistoryRef = useRef([]);
  const wsRef = useRef();
  const canvasRef = useRef();

  useEffect(() => {
    const address = process.env.WS_SERVER_ADDRESS;
    const port = process.env.WS_SERVER_PORT || 3001;
    if (address) {
      wsRef.current = new WebSocket(`ws://${address}:${port}`);
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
    } else {
      setConnectionInfoMessage("Unable to connect to the game server.");
    }
  }, []);

  const handleError = () => {
    setConnectionInfoMessage(
      "Unable to connect to the game server. Please try again later."
    );
  };

  const handleOpen = () => {
    setConnectionInfoMessage("");
  };

  // Param message: a stringified JSON object containing the message properties which determine
  // which action(s) will be performed
  const handleMessage = (message) => {
    const parsedData = JSON.parse(message.data);
    const messageValue = parsedData.value;
    switch (parsedData.type) {
      case "backgroundColorUpdate":
        setBackgroundColorClass(messageValue);
        break;
      case "chatHistory":
        addChatHistory(messageValue);
        break;
      case "chatMessage":
        addNewChatMessage(
          messageValue.text,
          messageValue.sender,
          messageValue.className
        );
        break;
      case "drawerInfoUpdate":
        setDrawerInfo(messageValue);
        break;
      case "drawerStatusChange":
        setDrawingAllowed(messageValue);
        break;
      case "inputValues":
        setBrushStyle(messageValue.brushStyle);
        setChatMessageMaxLength(messageValue.chatMessageMaxLength);
        setPlayerNameMaxLength(messageValue.playerNameMaxLength);
        break;
      case "lineHistory":
        updateLineHistory(messageValue);
        break;
      case "lineHistoryWithRedraw":
        updateLineHistory(messageValue);
        canvasRef.current.dispatchEvent(new CustomEvent("redraw"));
        break;
      case "nameChangeStatus":
        setNameChangeStatus(messageValue);
        break;
      case "newLineData":
        canvasRef.current.dispatchEvent(
          new CustomEvent("newLine", { detail: messageValue })
        );
        break;
      case "playerListUpdate":
        updatePlayerNameList(messageValue);
        break;
      case "roundTimeUpdate":
        setTimeLeft(messageValue);
        break;
    }
  };

  const handleClose = () => {
    setConnectionInfoMessage("The connection to the game server was closed.");
  };

  // Param linePoints: an array of objects which contain properties for each line point (coordinates, color, style)
  const sendNewLineData = (linePoints) => {
    wsRef.current.send(
      JSON.stringify({
        type: "newLineData",
        data: linePoints,
      })
    );
  };

  const updateLineHistory = (lineHistory) => {
    lineHistoryRef.current = lineHistory;
    setUndoButtonsDisabled(lineHistory.length == 0);
  };

  const undoDrawing = (undoAll) => {
    wsRef.current.send(JSON.stringify({ type: "undoDrawing", data: undoAll }));
  };

  // Param inputElement: the <input> element whose value will be cleared when sending a message
  const sendChatMessage = (inputElement) => {
    const message = inputElement.value.trim();
    if (message) {
      wsRef.current.send(
        JSON.stringify({ type: "chatMessage", data: message })
      );
    }
    inputElement.value = "";
  };

  const addChatHistory = (chatHistory) => {
    messagesRef.current = chatHistory;
    setMessages(messagesRef.current);
  };

  const addNewChatMessage = (text, sender, className) => {
    messagesRef.current.push({
      sender: sender,
      text: text,
      className: className,
    });
    setMessages([...messagesRef.current]);
  };

  const updatePlayerNameList = (newNameList) => {
    playerNamesRef.current = newNameList;
    setPlayerNames([...playerNamesRef.current]);
  };

  const requestNameChange = (newName) => {
    wsRef.current.send(
      JSON.stringify({ type: "nameChangeRequest", data: newName })
    );
  };

  return (
    <div className={style.gameContainer}>
      <div className={`${style.background} ${style[backgroundColorClass]}`}>
        <div className={style.gradient} />
      </div>
      <RoundInfo drawerInfo={drawerInfo} timeLeft={timeLeft} />
      <div className={style.controls}>
        <GameCanvas
          canvasRef={canvasRef}
          brushStyle={brushStyle}
          drawingAllowed={drawingAllowed}
          sendNewLineData={sendNewLineData}
          lineHistoryRef={lineHistoryRef}
        />
        <Chatbox
          messages={messages}
          sendChatMessage={sendChatMessage}
          chatMessageMaxLength={chatMessageMaxLength}
        />
        <Tabs drawingAllowed={drawingAllowed}>
          <BrushOptions
            brushStyle={brushStyle}
            setBrushStyle={setBrushStyle}
            undoDrawing={undoDrawing}
            undoButtonsDisabled={undoButtonsDisabled}
            tabButtonText={"✏️"}
            enabledOnlyWhenDrawer={true}
          />
          <PlayerList
            playerNames={playerNames}
            setNameChangeModalOpen={setNameChangeModalOpen}
            tabButtonText={"👥"}
          />
        </Tabs>
        <NameChangeModal
          nameMaxLength={playerNameMaxLength}
          isOpen={nameChangeModalOpen}
          setIsOpen={setNameChangeModalOpen}
          requestNameChange={requestNameChange}
          status={nameChangeStatus}
          setStatus={setNameChangeStatus}
          defaultMessage={"Enter your new name"}
        />
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
