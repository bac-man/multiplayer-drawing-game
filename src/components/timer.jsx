import style from "./timer.module.scss";
import { useEffect, useState } from "react";

const Timer = ({ ws }) => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    ws.addEventListener("message", messageHandler);
    return () => {
      ws.removeEventListener("message", messageHandler);
    };
  }, []);

  const messageHandler = (message) => {
    const parsedData = JSON.parse(message.data);
    if (parsedData.type === "roundTimeUpdate") {
      setTimeLeft(parsedData.data);
    }
  };

  return (
    <div className={style.timer}>
      <span>{timeLeft}</span>
    </div>
  );
};

export default Timer;
