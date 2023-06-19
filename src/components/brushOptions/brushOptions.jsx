import { useEffect, useState } from "react";
import style from "./brushOptions.module.scss";

const BrushOptions = ({
  brushStyle,
  setBrushStyle,
  drawingAllowed,
  maxBrushSize,
  undoLine,
}) => {
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [color, setColor] = useState(brushStyle.strokeStyle);
  const [size, setSize] = useState(brushStyle.lineWidth);

  useEffect(() => {
    const newBrushStyle = { ...brushStyle };
    newBrushStyle.strokeStyle = color;
    newBrushStyle.lineWidth = size;
    setBrushStyle(newBrushStyle);
  }, [color, size]);

  useEffect(() => {
    if (!drawingAllowed && optionsVisible) {
      setOptionsVisible(false);
    }
  }, [drawingAllowed]);

  return (
    <div className={style.brushOptions}>
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
          max={maxBrushSize}
          value={size}
          onChange={(e) => {
            setSize(e.target.value);
          }}
        />
      </div>
      <button disabled={!drawingAllowed} onClick={undoLine}>
        Undo
      </button>
    </div>
  );
};

export default BrushOptions;
