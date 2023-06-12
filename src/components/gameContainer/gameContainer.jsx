import { useEffect, useState } from "react";
import Chatbox from "../chatbox/chatbox";
import RoundInfo from "../roundInfo/roundInfo";
import GameCanvas from "../gameCanvas/gameCanvas";
import BrushOptions from "../brushOptions/brushOptions";
import style from "./gameContainer.module.scss";

const GameContainer = ({ ws }) => {
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

  useEffect(() => {
    ws.addEventListener("error", handleError);
    ws.addEventListener("open", handleOpen);
    ws.addEventListener("message", handleMessage);
    return () => {
      ws.removeEventListener("error", handleError);
      ws.removeEventListener("open", handleOpen);
      ws.removeEventListener("message", handleMessage);
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
      case "drawerStatusChange":
        setDrawingAllowed(parsedData.data);
        break;
      case "roundStart":
        setRoundEndGradientVisible(false);
        break;
      case "roundEnd":
        setRoundEndGradientColor(parsedData.data);
        setRoundEndGradientVisible(true);
        break;
    }
  };

  return (
    <div className={style.container}>
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
      <RoundInfo ws={ws} />
      <div className={style.wrapper}>
        <GameCanvas
          ws={ws}
          brushStyle={brushStyle}
          drawingAllowed={drawingAllowed}
        />
        <div className={style.tabs}>
          <Chatbox ws={ws} isHidden={selectedTab !== 0} />
          <BrushOptions
            ws={ws}
            isHidden={selectedTab !== 1}
            brushStyle={brushStyle}
            setBrushStyle={setBrushStyle}
            drawingAllowed={drawingAllowed}
            maxBrushSize={maxBrushSize}
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
