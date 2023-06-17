import style from "./playerList.module.scss";

const PlayerList = ({ playerNames, isHidden }) => {
  return (
    <div className={`${style.playerList} ${isHidden ? "hidden" : ""}`}>
      <ul>
        {playerNames.map((name, index) => {
          return <li key={index}>{name}</li>;
        })}
      </ul>
    </div>
  );
};

export default PlayerList;
