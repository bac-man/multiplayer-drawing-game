import { useState } from "react";
import Chatbox from "./chatbox";
import DrawerInfo from "./drawerInfo";
import GameCanvas from "./gameCanvas";
import BrushOptions from "./brushOptions";
import style from "./gameContainer.module.scss";

const GameContainer = ({ ws }) => {
  const [brushStyle, setBrushStyle] = useState({
    lineWidth: 30,
    lineCap: "round",
    strokeStyle: "#000000",
  });

  return (
    <div className={style.container}>
      <DrawerInfo ws={ws} />
      <div className={style.wrapper}>
        <GameCanvas ws={ws} brushStyle={brushStyle} />
        <Chatbox ws={ws} />
      </div>
      <BrushOptions brushStyle={brushStyle} setBrushStyle={setBrushStyle} />
    </div>
  );
};

export default GameContainer;
