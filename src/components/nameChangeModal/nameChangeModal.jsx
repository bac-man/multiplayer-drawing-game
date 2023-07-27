import { useRef } from "react";
import style from "./nameChangeModal.module.scss";

const NameChangeModal = ({ isOpen, setIsOpen, requestNameChange }) => {
  const nameFieldRef = useRef();
  const confirmRequest = () => {
    requestNameChange(nameFieldRef.current.value);
    setIsOpen(false);
  };
  return (
    <>
      {isOpen && (
        <div className={style.modal}>
          <span>Enter your new name</span>
          <input
            ref={nameFieldRef}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                confirmRequest();
              }
            }}
          />
          <div className={style.buttons}>
            <button onClick={confirmRequest}>OK</button>
            <button
              onClick={() => {
                setIsOpen(false);
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default NameChangeModal;
