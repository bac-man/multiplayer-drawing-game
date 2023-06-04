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
  const [drawingAllowed, setDrawingAllowed] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);

  useEffect(() => {
    ws.addEventListener("message", messageHandler);
    return () => {
      ws.removeEventListener("message", messageHandler);
    };
  }, []);

  useEffect(() => {
    if (!drawingAllowed) {
      setSelectedTab(0);
    }
  }, [drawingAllowed]);

  const messageHandler = (message) => {
    const parsedData = JSON.parse(message.data);
    if (parsedData.type === "drawerStatusChange") {
      setDrawingAllowed(parsedData.data);
    }
  };

  return (
    <div className={style.container}>
      <div
        className={`${style.drawingModeGradient} ${
          drawingAllowed ? "" : style.hidden
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
          <div className={style.tabButtons}>
            <button
              onClick={() => {
                setSelectedTab(0);
              }}
            >
              Chat
            </button>
            <button
              onClick={() => {
                setSelectedTab(1);
              }}
              disabled={!drawingAllowed}
            >
              Drawing
            </button>
          </div>
          <Chatbox ws={ws} isHidden={selectedTab !== 0} />
          <BrushOptions
            ws={ws}
            isHidden={selectedTab !== 1}
            brushStyle={brushStyle}
            setBrushStyle={setBrushStyle}
            drawingAllowed={drawingAllowed}
            maxBrushSize={maxBrushSize}
          />
        </div>
      </div>
    </div>
  );
};

export default GameContainer;
