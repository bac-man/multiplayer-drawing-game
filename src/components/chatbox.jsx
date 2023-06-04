import { useEffect, useRef, useState } from "react";
import style from "./chatbox.module.scss";

const Chatbox = ({ ws, isHidden }) => {
  const inputRef = useRef();
  const messagesWrapperRef = useRef();
  const [messages, setMessages] = useState([]);
  const messagesRef = useRef(messages);
  const [autoScrolling, setAutoScrolling] = useState(true);
  const autoScrollUpdateThrottling = useRef(false);

  const resizeObserver = new ResizeObserver(() => {
    updateAutoScrollStatus();
  });

  useEffect(() => {
    resizeObserver.observe(messagesWrapperRef.current);
    return () => {
      resizeObserver.unobserve(messagesWrapperRef.current);
    };
  }, []);

  useEffect(() => {
    const messageList = messagesWrapperRef.current;
    if (autoScrolling) {
      messageList.scrollTop = messageList.scrollHeight;
    }
    ws.addEventListener("message", messageHandler);
    return () => {
      ws.removeEventListener("message", messageHandler);
    };
  }, [messages]);

  const updateAutoScrollStatus = () => {
    if (!autoScrollUpdateThrottling.current) {
      autoScrollUpdateThrottling.current = true;
      setTimeout(() => {
        const messagesWrapper = messagesWrapperRef.current;
        if (
          messagesWrapper.scrollHeight -
            messagesWrapper.clientHeight -
            messagesWrapper.scrollTop <=
          20
        ) {
          setAutoScrolling(true);
        } else {
          setAutoScrolling(false);
        }
        autoScrollUpdateThrottling.current = false;
      }, 250);
    }
  };

  const sendMessage = () => {
    const message = inputRef.current.value.trim();
    if (message) {
      ws.send(JSON.stringify({ type: "chatMessage", data: message }));
    }
    inputRef.current.value = "";
  };

  const addNewMessage = (text, sender, className) => {
    // Update the messages state via ref to avoid missing messages when multiple
    // are received in a short timespan (state updates are not synchronous/instant)
    messagesRef.current.push({
      sender: sender,
      text: text,
      className: className,
    });
    setMessages([...messagesRef.current]);
  };

  const messageHandler = (message) => {
    const parsedData = JSON.parse(message.data);
    switch (parsedData.type) {
      case "chatMessage":
        const messageData = parsedData.data;
        addNewMessage(
          messageData.text,
          messageData.sender,
          messageData.className
        );
        break;
      case "chatHistory":
        messagesRef.current = parsedData.data;
        setMessages(parsedData.data);
        break;
    }
  };

  return (
    <div className={`${style.chatbox} ${isHidden ? "hidden" : ""}`}>
      <div className={style.messageHistory}>
        {!autoScrolling && (
          <div
            className={style.autoScrollMessage}
            onClick={() => {
              messagesWrapperRef.current.scrollTop =
                messagesWrapperRef.current.scrollHeight;
            }}
          >
            <span>Continue auto scrolling</span>
            <div className={style.arrow} />
          </div>
        )}
        <div
          ref={messagesWrapperRef}
          className={style.messagesWrapper}
          onScroll={() => {
            updateAutoScrollStatus();
          }}
        >
          {messages.map((message, index) => {
            return (
              <div key={`message${index}`} className={style.message}>
                {message.sender && <span>{message.sender}: </span>}
                <span className={style[message.className]}>{message.text}</span>
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
