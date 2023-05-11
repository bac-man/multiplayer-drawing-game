import Chatbox from "./chatbox";
import GameCanvas from "./gameCanvas";
import style from "./gameContainer.module.scss";

const GameContainer = ({}) => {
  return (
    <div className={style.container}>
      <div className={style.wrapper}>
        <GameCanvas />
        <Chatbox />
      </div>
    </div>
  );
};

export default GameContainer;
