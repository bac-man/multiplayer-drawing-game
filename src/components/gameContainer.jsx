import { useEffect, useState } from "react";
import Chatbox from "./chatbox";
import DrawerInfo from "./drawerInfo";
import GameCanvas from "./gameCanvas";
import BrushOptions from "./brushOptions";
import style from "./gameContainer.module.scss";
import Timer from "./timer";

const GameContainer = ({ ws }) => {
  const [brushStyle, setBrushStyle] = useState({
    lineWidth: 30,
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
      <Timer ws={ws} />
      <DrawerInfo ws={ws} />
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
      />
    </div>
  );
};

export default GameContainer;
