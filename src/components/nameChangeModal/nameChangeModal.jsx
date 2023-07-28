import { useEffect, useRef, useState } from "react";
import style from "./nameChangeModal.module.scss";

const NameChangeModal = ({
  isOpen,
  setIsOpen,
  requestNameChange,
  status,
  setStatus,
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

  const close = () => {
    setIsOpen(false);
    setStatus({ success: false, message: "" });
  };

  useEffect(() => {
    if (status.success) {
      setInputsDisabled(true);
      setTimeout(() => {
        close();
        setInputsDisabled(false);
      }, 2000);
    }
  }, [status]);

  return (
    <>
      {isOpen && (
        <div className={style.modal}>
          <span>Enter your new name</span>
          {status.message && <span>{status.message}</span>}
          <input
            ref={nameFieldRef}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !inputsDisabled) {
                attemptNameChangeRequest();
              }
            }}
            disabled={inputsDisabled}
          />
          <div className={style.buttons}>
            <button
              onClick={attemptNameChangeRequest}
              disabled={inputsDisabled}
            >
              OK
            </button>
            <button onClick={close} disabled={inputsDisabled}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default NameChangeModal;
