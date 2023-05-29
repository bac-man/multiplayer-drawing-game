import { useEffect, useRef, useState } from "react";
import style from "./gameCanvas.module.scss";

const GameCanvas = ({ ws, brushStyle, drawingAllowed }) => {
  const baselineWidth = 1280;
  const canvasRef = useRef();
  const [lineStarted, setLineStarted] = useState(false);
  const [currentLinePoints, setCurrentLinePoints] = useState([]);
  const redrawThrottling = useRef(false);
  const lineHistory = useRef([]);

  const resizeObserver = new ResizeObserver(() => {
    updateDimensions();
  });

  useEffect(() => {
    updateDimensions();
    resizeObserver.observe(canvasRef.current);
    ws.addEventListener("message", messageHandler);
    return () => {
      resizeObserver.unobserve(canvasRef.current);
      ws.removeEventListener("message", messageHandler);
    };
  }, []);

  const messageHandler = (message) => {
    const parsedData = JSON.parse(message.data);
    switch (parsedData.type) {
      case "newLineData":
        drawFullLine(parsedData.data);
        break;
      case "lineHistoryWithRedraw":
        lineHistory.current = parsedData.data;
        redraw();
        break;
      case "lineHistory":
        lineHistory.current = parsedData.data;
        break;
    }
  };

  const updateDimensions = () => {
    if (!redrawThrottling.current) {
      redrawThrottling.current = true;
      setTimeout(() => {
        canvasRef.current.width = canvasRef.current.clientWidth;
        canvasRef.current.height = canvasRef.current.clientHeight;
        redraw();
        redrawThrottling.current = false;
      }, 250);
    }
  };

  const redraw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    lineHistory.current.forEach((line) => {
      drawFullLine(line);
    });
  };

  const drawLinePoint = (posX, posY, options, previousPoint) => {
    const ctx = canvasRef.current.getContext("2d");
    const scale = canvasRef.current.width / baselineWidth;
    ctx.lineCap = options.lineCap;
    ctx.lineWidth = options.lineWidth * scale;
    ctx.strokeStyle = options.strokeStyle;
    ctx.beginPath();
    ctx.moveTo(posX * scale, posY * scale);
    ctx.lineTo(posX * scale, posY * scale);
    ctx.stroke();
    // Connect the new point to the previous one
    if (previousPoint) {
      ctx.lineTo(previousPoint.x * scale, previousPoint.y * scale);
      ctx.stroke();
    }
  };

  const drawCurrentLinePoint = (e) => {
    const canvas = canvasRef.current;
    const canvasRect = canvas.getBoundingClientRect();
    const scale = baselineWidth / canvas.width;
    const posX = (e.clientX - canvasRect.left) * scale;
    const posY = (e.clientY - canvasRect.top) * scale;
    drawLinePoint(
      posX,
      posY,
      brushStyle,
      currentLinePoints[currentLinePoints.length - 1]
    );
    currentLinePoints.push({ x: posX, y: posY, options: brushStyle });
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

  const drawFullLine = (linePoints) => {
    linePoints.forEach((point, index) => {
      const posX = point.x;
      const posY = point.y;
      drawLinePoint(posX, posY, point.options, linePoints[index - 1]);
    });
  };

  const getTouchEventCoordinates = (e) => {
    const touch = e.touches[0];
    return { clientX: touch.clientX, clientY: touch.clientY };
  };

  return (
    <div className={style.wrapper}>
      <canvas
        ref={canvasRef}
        className={`${style.canvas} ${
          drawingAllowed ? null : style.drawingDisabled
        }`}
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
    </div>
  );
};

export default GameCanvas;
