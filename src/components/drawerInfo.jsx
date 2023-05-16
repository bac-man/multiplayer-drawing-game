import { useState } from "react";
import style from "./drawerInfo.module.scss";

const DrawerInfo = ({ ws }) => {
  const [text, setText] = useState();

  ws.addEventListener("message", (message) => {
    const parsedData = JSON.parse(message.data);
    if (parsedData.type === "drawerInfoUpdate") {
      setText(parsedData.data);
    }
  });

  return (
    <div className={style.textContainer}>{text && <span>{text}</span>}</div>
  );
};
export default DrawerInfo;
