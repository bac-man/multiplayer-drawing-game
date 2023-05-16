import { useRef } from "react";
import Chatbox from "./chatbox";
import DrawerInfo from "./drawerInfo";
import GameCanvas from "./gameCanvas";
import style from "./gameContainer.module.scss";

const GameContainer = ({}) => {
  const ws = useRef(new WebSocket("ws://192.168.0.104:3001"));

  return (
    <div className={style.container}>
      <DrawerInfo ws={ws.current} />
      <div className={style.wrapper}>
        <GameCanvas ws={ws.current} />
        <Chatbox ws={ws.current} />
      </div>
    </div>
  );
};

export default GameContainer;
