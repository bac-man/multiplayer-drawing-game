import { useRef } from "react";
import Chatbox from "./chatbox";
import GameCanvas from "./gameCanvas";
import style from "./gameContainer.module.scss";

const GameContainer = ({}) => {
  const ws = useRef(new WebSocket("ws://192.168.0.104:3001"));
  return (
    <div className={style.container}>
      <div className={style.wrapper}>
        <GameCanvas ws={ws.current} />
        <Chatbox ws={ws.current} />
      </div>
    </div>
  );
};

export default GameContainer;
