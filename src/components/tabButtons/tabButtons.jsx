import style from "./tabButtons.module.scss";

const TabButtons = ({ selectedTab, setSelectedTab, drawingAllowed }) => {
  return (
    <div className={style.tabButtons}>
      <button
        onClick={() => {
          setSelectedTab(0);
        }}
        className={`${selectedTab === 0 ? style.selected : ""}`}
      >
        Chat
      </button>
      <button
        onClick={() => {
          setSelectedTab(1);
        }}
        className={`${selectedTab === 1 ? style.selected : ""}`}
        disabled={!drawingAllowed}
      >
        Drawing tools
      </button>
      <button
        onClick={() => {
          setSelectedTab(2);
        }}
        className={`${selectedTab === 2 ? style.selected : ""}`}
      >
        Player list
      </button>
    </div>
  );
};

export default TabButtons;
