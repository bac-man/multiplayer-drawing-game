import style from "./playerList.module.scss";

const PlayerList = ({ playerNames, setNameChangeModalOpen }) => {
  return (
    <div className={style.playerList}>
      <div className={style.nameListWrapper}>
        <ul>
          {playerNames.map((name, index) => {
            return <li key={`playerName${index}`}>{name}</li>;
          })}
        </ul>
      </div>
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
