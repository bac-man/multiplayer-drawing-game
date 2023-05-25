import { useEffect, useState } from "react";
import Chatbox from "./chatbox";
import RoundInfo from "./roundInfo";
import GameCanvas from "./gameCanvas";
import BrushOptions from "./brushOptions";
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

  useEffect(() => {
    ws.addEventListener("message", messageHandler);
    return () => {
      ws.removeEventListener("message", messageHandler);
    };
  }, []);

  const messageHandler = (message) => {
    const parsedData = JSON.parse(message.data);
    if (parsedData.type === "drawerStatusChange") {
      setDrawingAllowed(parsedData.data);
    }
  };

  return (
    <div className={style.container}>
      <RoundInfo ws={ws} />
      <div className={style.wrapper}>
        <GameCanvas
          ws={ws}
          brushStyle={brushStyle}
          drawingAllowed={drawingAllowed}
        />
        <Chatbox ws={ws} />
      </div>
      <BrushOptions
        ws={ws}
        brushStyle={brushStyle}
        setBrushStyle={setBrushStyle}
        drawingAllowed={drawingAllowed}
        maxBrushSize={maxBrushSize}
      />
    </div>
  );
};

export default GameContainer;
