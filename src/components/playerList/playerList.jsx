import style from "./playerList.module.scss";

const PlayerList = ({ playerNames, setNameChangeModalOpen }) => {
  return (
    <div className={style.playerList}>
      <ul>
        {playerNames.map((name, index) => {
          return <li key={`playerName${index}`}>{name}</li>;
        })}
      </ul>
      <button
        onClick={() => {
          setNameChangeModalOpen(true);
        }}
      >
        Change name
      </button>
    </div>
  );
};

export default PlayerList;
