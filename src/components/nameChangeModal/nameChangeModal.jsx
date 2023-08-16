import { useEffect, useRef, useState } from "react";
import style from "./nameChangeModal.module.scss";

const NameChangeModal = ({
  nameMaxLength,
  isOpen,
  setIsOpen,
  requestNameChange,
  status,
  setStatus,
  defaultMessage,
}) => {
  const nameFieldRef = useRef();
  const [inputsDisabled, setInputsDisabled] = useState(false);

  const attemptNameChangeRequest = () => {
    const requestedName = nameFieldRef.current.value.trim();
    if (!requestedName) {
      setStatus({
        success: false,
        message:
          "Your name cannot be empty or consist only of whitespace characters.",
      });
    } else {
      requestNameChange(nameFieldRef.current.value.trim());
      setStatus({ success: false, message: "Please wait..." });
    }
  };

  useEffect(() => {
    if (status.success) {
      setInputsDisabled(true);
      setTimeout(() => {
        setIsOpen(false);
        setInputsDisabled(false);
      }, 2000);
    }
  }, [status]);

  return (
    <div
      className={`${style.modal} ${isOpen ? "" : style.hidden}`}
      onTransitionEnd={(e) => {
        if ([...e.target.classList].includes(style.hidden)) {
          setStatus({ success: false, message: defaultMessage });
          nameFieldRef.current.value = "";
        }
      }}
    >
      <span>{status.message || defaultMessage}</span>
      <input
        ref={nameFieldRef}
        type={"text"}
        maxLength={nameMaxLength}
        autoCapitalize={"on"}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !inputsDisabled) {
            attemptNameChangeRequest();
          }
        }}
        disabled={inputsDisabled}
      />
      <div className={style.buttons}>
        <button onClick={attemptNameChangeRequest} disabled={inputsDisabled}>
          OK
        </button>
        <button onClick={() => setIsOpen(false)} disabled={inputsDisabled}>
          Close
        </button>
      </div>
    </div>
  );
};

export default NameChangeModal;
