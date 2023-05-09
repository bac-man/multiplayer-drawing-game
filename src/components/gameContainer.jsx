import GameCanvas from "./gameCanvas";
import style from "./gameContainer.module.scss";

const GameContainer = ({}) => {
  return (
    <div className={style.container}>
      <GameCanvas />
    </div>
  );
};

export default GameContainer;
