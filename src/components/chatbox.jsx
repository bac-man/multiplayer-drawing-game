import { useEffect, useRef, useState } from "react";
import style from "./chatbox.module.scss";

const Chatbox = ({ ws }) => {
  const inputRef = useRef();
  const messagesWrapperRef = useRef();
  const [messages, setMessages] = useState([]);
  const messagesRef = useRef(messages);
  const [initialScrollPerformed, setInitialScrollPerformed] = useState(false);

  useEffect(() => {
    const messageList = messagesWrapperRef.current;
    if (!initialScrollPerformed && messages.length > 0) {
      messageList.scrollTop = messageList.scrollHeight;
      setInitialScrollPerformed(true);
    }
    if (
      messageList.scrollHeight -
        messageList.clientHeight -
        messageList.scrollTop <
      50
    ) {
      messageList.scrollTop = messageList.scrollHeight;
    }
    ws.addEventListener("message", messageHandler);
    return () => {
      ws.removeEventListener("message", messageHandler);
    };
  }, [messages]);

  const sendMessage = () => {
    const message = inputRef.current.value.trim();
    if (message) {
      ws.send(JSON.stringify({ type: "chatMessage", data: message }));
    }
    inputRef.current.value = "";
  };

  const addNewMessage = (text, sender) => {
    // Update the messages state via ref to avoid missing messages when multiple
    // are received in a short timespan (state updates are not synchronous/instant)
    messagesRef.current.push({
      sender: sender,
      text: text,
    });
    setMessages([...messagesRef.current]);
  };

  const messageHandler = (message) => {
    const parsedData = JSON.parse(message.data);
    switch (parsedData.type) {
      case "chatMessage":
        addNewMessage(parsedData.data.text, parsedData.data.sender);
        break;
      case "chatHistory":
        messagesRef.current = parsedData.data;
        setMessages(parsedData.data);
        break;
    }
  };

  return (
    <div className={style.chatbox}>
      <div className={style.messageHistory}>
        <div ref={messagesWrapperRef} className={style.messagesWrapper}>
          {messages.map((message, index) => {
            return (
              <div key={`message${index}`}>
                {message.sender && <span>{message.sender}: </span>}
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
