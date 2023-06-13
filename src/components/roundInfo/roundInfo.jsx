import style from "./roundInfo.module.scss";

const RoundInfo = ({ drawerInfo, timeLeft }) => {
  return (
    <div className={style.roundInfo}>
      <span>{timeLeft}</span>
      <span>{drawerInfo}</span>
    </div>
  );
};
export default RoundInfo;
