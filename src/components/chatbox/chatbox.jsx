import { useEffect, useRef, useState } from "react";
import style from "./chatbox.module.scss";

const Chatbox = ({ messages, sendChatMessage, chatMessageMaxLength }) => {
  const inputRef = useRef();
  const messagesWrapperRef = useRef();
  const [autoScrolling, setAutoScrolling] = useState(true);
  const autoScrollCheckTimeoutRef = useRef();

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
  }, [messages]);

  const updateAutoScrollStatus = () => {
    if (autoScrollCheckTimeoutRef.current) {
      clearTimeout(autoScrollCheckTimeoutRef.current);
    }
    autoScrollCheckTimeoutRef.current = setTimeout(() => {
      const messagesWrapper = messagesWrapperRef.current;
      const newScrollValue = messagesWrapper.scrollTop;
      if (
        messagesWrapper.scrollHeight -
          messagesWrapper.clientHeight -
          newScrollValue >=
        20
      ) {
        setAutoScrolling(false);
      } else {
        setAutoScrolling(true);
      }
    }, 150);
  };

  return (
    <div className={style.chatbox}>
      <div className={style.messageHistory}>
        {!autoScrolling && (
          <button
            className={style.autoScrollButton}
            onClick={() => {
              messagesWrapperRef.current.scrollTop =
                messagesWrapperRef.current.scrollHeight;
            }}
          >
            Continue auto scrolling
          </button>
        )}
        <div
          ref={messagesWrapperRef}
          className={style.messagesWrapper}
          onScroll={updateAutoScrollStatus}
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
          maxLength={chatMessageMaxLength}
          autoCapitalize={"on"}
          onKeyDown={(e) => {
            if (e.key == "Enter") {
              sendChatMessage(inputRef.current);
            }
          }}
        />
        <button
          onClick={() => {
            sendChatMessage(inputRef.current);
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chatbox;
