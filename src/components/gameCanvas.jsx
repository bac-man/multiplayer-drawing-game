import { useEffect, useRef, useState } from "react";
import style from "./gameCanvas.module.scss";

const GameCanvas = ({ ws }) => {
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
    const ctx = drawingOptions.current.ctx;
    const options = drawingOptions.current;
    ctx.lineCap = options.lineCap;
    ctx.lineWidth = options.lineWidth;
    ctx.strokeStyle = options.strokeStyle;
  }, []);

  ws.addEventListener("message", (message) => {
    const parsedData = JSON.parse(message.data);
    switch (parsedData.type) {
      case "newLineData":
        drawReceivedLine(parsedData.data);
        break;
      case "lineHistory":
        parsedData.data.forEach((line) => {
          drawReceivedLine(line);
        });
        break;
    }
  });

  const drawLinePoint = (posX, posY, previousPoint) => {
    const ctx = drawingOptions.current.ctx;
    ctx.beginPath();
    ctx.moveTo(posX, posY);
    ctx.lineTo(posX, posY);
    ctx.stroke();
    // Connect the new point to the previous one
    if (previousPoint) {
      ctx.lineTo(previousPoint.x, previousPoint.y);
      ctx.stroke();
    }
  };

  const drawCurrentLinePoint = (e) => {
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
    drawLinePoint(posX, posY, currentLinePoints[currentLinePoints.length - 1]);
    currentLinePoints.push({ x: posX, y: posY });
  };

  const startDrawingLine = (e) => {
    drawCurrentLinePoint(e);
    setLineStarted(true);
  };

  const endLine = () => {
    setLineStarted(false);
    setCurrentLinePoints([]);
    ws.send(
      JSON.stringify({
        type: "newLineData",
        data: currentLinePoints,
      })
    );
  };

  const drawReceivedLine = (linePoints) => {
    linePoints.forEach((point, index) => {
      const posX = point.x;
      const posY = point.y;
      drawLinePoint(posX, posY, linePoints[index - 1]);
    });
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
          drawCurrentLinePoint(e);
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
          drawCurrentLinePoint(getTouchEventCoordinates(e));
        }
      }}
    />
  );
};

export default GameCanvas;
