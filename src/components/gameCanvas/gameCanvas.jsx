import { useEffect, useImperativeHandle, useRef, useState } from "react";
import style from "./gameCanvas.module.scss";

const GameCanvas = ({
  canvasRef,
  brushStyle,
  drawingAllowed,
  sendNewLineData,
  lineHistoryRef,
}) => {
  const baselineWidth = 1280;
  const [lineStarted, setLineStarted] = useState(false);
  const [currentLinePoints, setCurrentLinePoints] = useState([]);
  const redrawThrottling = useRef(false);

  const resizeObserver = new ResizeObserver(() => {
    updateDimensions();
  });

  useEffect(() => {
    canvasRef.current.addEventListener("redraw", redraw);
    canvasRef.current.addEventListener("newLine", handleNewLine);
    updateDimensions();
    resizeObserver.observe(canvasRef.current);
    return () => {
      canvasRef.current.removeEventListener("redraw", redraw);
      canvasRef.current.removeEventListener("newLine", handleNewLine);
      resizeObserver.unobserve(canvasRef.current);
    };
  }, []);

  useEffect(() => {
    if (!drawingAllowed && lineStarted) {
      endLine(false);
      redraw();
    }
  }, [drawingAllowed]);

  const handleNewLine = (e) => {
    drawFullLine(e.detail);
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
    lineHistoryRef.current?.forEach((line) => {
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

  const endLine = (sendData = true) => {
    setLineStarted(false);

    if (sendData) {
      sendNewLineData(currentLinePoints);
    }
    setCurrentLinePoints([]);
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
          document.activeElement.blur();
          startDrawingLine(e);
        }}
        onMouseUp={() => {
          endLine();
        }}
        onMouseMove={(e) => {
          if (lineStarted) {
            drawCurrentLinePoint(e);
          }
        }}
        onTouchStart={(e) => {
          document.activeElement.blur();
          startDrawingLine(getTouchEventCoordinates(e));
        }}
        onTouchEnd={(e) => {
          // Prevent artificial mouse events
          e.preventDefault();
          endLine();
        }}
        onMouseLeave={(e) => {
          if (lineStarted) {
            endLine();
          }
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
