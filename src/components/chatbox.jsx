import { useRef, useState } from "react";
import style from "./chatbox.module.scss";

const Chatbox = ({ ws }) => {
  const inputRef = useRef();
  const [messages, setMessages] = useState([]);

  const sendMessage = () => {
    const message = inputRef.current.value.trim();
    if (message) {
      ws.send(JSON.stringify({ type: "chatMessage", data: message }));
    }
    inputRef.current.value = "";
  };

  ws.addEventListener("message", (message) => {
    const parsedData = JSON.parse(message.data);
    switch (parsedData.type) {
      case "chatMessage":
        messages.push({
          sender: parsedData.data.sender,
          text: parsedData.data.text,
        });
        // Update state with a copy to re-render
        setMessages([...messages]);
        break;
      case "chatHistory":
        setMessages(parsedData.data);
        break;
    }
  });

  return (
    <div className={style.chatbox}>
      <div className={style.messageHistory}>
        <div className={style.messagesWrapper}>
          {messages.map((message, index) => {
            return (
              <div key={`message${index}`}>
                <span>{message.sender}: </span>
                <span>{message.text}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className={style.inputWrapper}>
        <input
          ref={inputRef}
          type={"text"}
          onKeyDown={(e) => {
            if (e.key == "Enter") {
              sendMessage();
            }
          }}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
};

export default Chatbox;
