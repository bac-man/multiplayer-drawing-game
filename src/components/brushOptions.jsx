import { useEffect, useState } from "react";
import style from "./brushOptions.module.scss";

const BrushOptions = ({ brushStyle, setBrushStyle }) => {
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [color, setColor] = useState(brushStyle.strokeStyle);
  const [size, setSize] = useState(brushStyle.lineWidth);

  useEffect(() => {
    const newBrushStyle = { ...brushStyle };
    newBrushStyle.strokeStyle = color;
    newBrushStyle.lineWidth = size;
    setBrushStyle(newBrushStyle);
  }, [color, size]);

  return (
    <div className={style.brushOptions}>
      <button
        onClick={() => {
          setOptionsVisible(!optionsVisible);
        }}
      >
        {`${optionsVisible ? "Hide" : "Show"} brush options`}
      </button>
      {optionsVisible && (
        <div className={style.options}>
          <div className={style.field}>
            <label htmlFor={"brushColor"}>Brush color</label>
            <input
              type={"color"}
              name={"brushColor"}
              value={color}
              onChange={(e) => {
                setColor(e.target.value);
              }}
            />
          </div>
          <div className={style.field}>
            <label htmlFor={"brushSize"}>Brush size</label>
            <input
              type={"range"}
              name={"brushSize"}
              min={1}
              max={50}
              value={size}
              onChange={(e) => {
                setSize(e.target.value);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BrushOptions;