import style from "./playerList.module.scss";

const PlayerList = ({ playerNames }) => {
  return (
    <div className={style.playerList}>
      <ul>
        {playerNames.map((name, index) => {
          return <li key={`playerName${index}`}>{name}</li>;
        })}
      </ul>
    </div>
  );
};

export default PlayerList;
