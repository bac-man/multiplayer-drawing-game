import style from "./chatbox.module.scss";

const Chatbox = ({}) => {
  return (
    <div className={style.chatbox}>
      <div className={style.messageHistory} />
      <div className={style.inputWrapper}>
        <input type={"text"} />
        <button>Send</button>
      </div>
    </div>
  );
};

export default Chatbox;
