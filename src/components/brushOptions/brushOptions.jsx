import { useEffect, useRef, useState } from "react";
import style from "./brushOptions.module.scss";

const BrushOptions = ({
  brushStyle,
  setBrushStyle,
  undoDrawing,
  undoButtonsDisabled,
}) => {
  const [color, setColor] = useState("");
  const [size, setSize] = useState(1);
  const [maxBrushSize, setMaxBrushSize] = useState();
  const initialValuesSetRef = useRef(false);

  useEffect(() => {
    if (!initialValuesSetRef.current) {
      if (Object.keys(brushStyle).length === 0) {
        return;
      }
      setMaxBrushSize(brushStyle.maxBrushSize);
      setSize(brushStyle.lineWidth);
      setColor(brushStyle.strokeStyle);
      initialValuesSetRef.current = true;
    }
  }, [brushStyle]);

  useEffect(() => {
    if (initialValuesSetRef.current) {
      const newBrushStyle = { ...brushStyle };
      newBrushStyle.strokeStyle = color;
      newBrushStyle.lineWidth = size;
      setBrushStyle(newBrushStyle);
    }
  }, [color, size]);

  return (
    <div className={style.brushOptions}>
      <div className={style.fields}>
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
          <div className={style.rangeInputContainer}>
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
            <span>{size}</span>
          </div>
        </div>
        <div className={style.undoButtons}>
          <button
            disabled={undoButtonsDisabled}
            onClick={() => {
              undoDrawing(false);
            }}
          >
            Undo
          </button>
          <button
            disabled={undoButtonsDisabled}
            onClick={() => {
              undoDrawing(true);
            }}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
};

export default BrushOptions;
