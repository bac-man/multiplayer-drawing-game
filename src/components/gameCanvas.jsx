import { useEffect, useRef, useState } from "react";
import style from "./gameCanvas.module.scss";

const GameCanvas = ({}) => {
  const canvasRef = useRef();
  const [lineStarted, setLineStarted] = useState(false);
  const [currentLinePoints, setCurrentLinePoints] = useState([]);
  const drawingOptions = useRef();

  useEffect(() => {
    drawingOptions.current = {
      ctx: canvasRef.current.getContext("2d"),
      lineCap: "round",
      lineWidth: 6,
      strokeStyle: "rgb(0, 0, 0);",
    };
  }, []);

  const drawLinePoint = (e) => {
    const options = drawingOptions.current;
    const ctx = options.ctx;
    ctx.lineCap = options.lineCap;
    ctx.lineWidth = options.lineWidth;
    ctx.strokeStyle = options.strokeStyle;
    const canvas = canvasRef.current;
    const canvasRect = canvas.getBoundingClientRect();

    const xScale =
      window.getComputedStyle(canvas).getPropertyValue("width").split("px")[0] /
      canvas.width;
    const yScale =
      window
        .getComputedStyle(canvas)
        .getPropertyValue("height")
        .split("px")[0] / canvas.height;

    const posX = (e.clientX - canvasRect.left) / xScale;
    const posY = (e.clientY - canvasRect.top) / yScale;

    ctx.beginPath();
    ctx.moveTo(posX, posY);
    ctx.lineTo(posX, posY);
    ctx.stroke();

    const previousPoint = currentLinePoints[currentLinePoints.length - 1];
    if (previousPoint) {
      ctx.lineTo(previousPoint.x, previousPoint.y);
      ctx.stroke();
    }

    currentLinePoints.push({ x: posX, y: posY });
  };

  const startDrawingLine = (e) => {
    drawLinePoint(e);
    setLineStarted(true);
  };

  const endLine = () => {
    setCurrentLinePoints([]);
    setLineStarted(false);
  };

  const getTouchEventCoordinates = (e) => {
    const touch = e.touches[0];
    return { clientX: touch.clientX, clientY: touch.clientY };
  };

  return (
    <canvas
      ref={canvasRef}
      className={style.canvas}
      onMouseDown={(e) => {
        startDrawingLine(e);
      }}
      onMouseUp={endLine}
      onMouseMove={(e) => {
        if (lineStarted) {
          drawLinePoint(e);
        }
      }}
      onTouchStart={(e) => {
        startDrawingLine(getTouchEventCoordinates(e));
      }}
      onTouchEnd={(e) => {
        // Prevent artificial mouse events
        e.preventDefault();
        endLine();
      }}
      onTouchMove={(e) => {
        if (lineStarted) {
          drawLinePoint(getTouchEventCoordinates(e));
        }
      }}
    />
  );
};

export default GameCanvas;
