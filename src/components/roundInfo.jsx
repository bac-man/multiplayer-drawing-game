import { useState } from "react";
import style from "./roundInfo.module.scss";

const RoundInfo = ({ ws }) => {
  const [drawerInfo, setDrawerInfo] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);

  ws.addEventListener("message", (message) => {
    const parsedData = JSON.parse(message.data);
    if (parsedData.type === "drawerInfoUpdate") {
      setDrawerInfo(parsedData.data);
    } else if (parsedData.type === "roundTimeUpdate") {
      setTimeLeft(parsedData.data);
    }
  });

  return (
    <div className={style.roundInfo}>
      <span>{timeLeft}</span>
      <span>{drawerInfo}</span>
    </div>
  );
};
export default RoundInfo;
