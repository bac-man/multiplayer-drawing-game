import { useEffect, useRef, useState } from "react";
import style from "./gameCanvas.module.scss";

const GameCanvas = ({ ws }) => {
  const baselineWidth = 1280;
  const canvasRef = useRef();
  const wrapperRef = useRef();
  const [lineStarted, setLineStarted] = useState(false);
  const [currentLinePoints, setCurrentLinePoints] = useState([]);
  const [drawingAllowed, setDrawingAllowed] = useState(false);
  const redrawThrottling = useRef(false);
  const lineHistory = useRef([]);
  const drawingOptions = useRef({
    lineCap: "square",
    lineWidth: 6,
    strokeStyle: "rgb(0, 0, 0);",
  });

  const resizeObserver = new ResizeObserver(() => {
    updateDimensions();
  });

  useEffect(() => {
    updateDimensions();
    resizeObserver.observe(canvasRef.current);
    return () => {
      resizeObserver.unobserve(canvasRef.current);
    };
  }, []);

  ws.addEventListener("message", (message) => {
    const parsedData = JSON.parse(message.data);
    switch (parsedData.type) {
      case "newLineData":
        drawFullLine(parsedData.data);
        break;
      case "lineHistoryCatchUp":
        lineHistory.current = parsedData.data;
        redraw();
        break;
      case "lineHistory":
        lineHistory.current = parsedData.data;
        break;
      case "drawerStatusChange":
        setDrawingAllowed(parsedData.data);
        break;
    }
  });

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
    lineHistory.current.forEach((line) => {
      drawFullLine(line);
    });
  };

  const drawLinePoint = (posX, posY, previousPoint) => {
    const ctx = canvasRef.current.getContext("2d");
    const scale = canvasRef.current.width / baselineWidth;
    const options = drawingOptions.current;
    ctx.lineCap = options.lineCap;
    ctx.lineWidth = options.lineWidth * scale;
    ctx.strokeStyle = options.strokeStyle;
    ctx.lineCap = "square";
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

  const drawFullLine = (linePoints) => {
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
    <div ref={wrapperRef} className={style.wrapper}>
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
