import { useEffect, useRef, useState } from "react";
import style from "./tabs.module.scss";

const Tabs = ({ children, drawingAllowed }) => {
  const firstNonDrawingIndexRef = useRef(null);
  const drawingToolsIndexRef = useRef(null);
  const [selectedTab, setSelectedTab] = useState(0);

  useEffect(() => {
    if (
      !drawingAllowed &&
      selectedTab == drawingToolsIndexRef.current &&
      firstNonDrawingIndexRef.current !== null
    ) {
      setSelectedTab(firstNonDrawingIndexRef.current);
    }
  }, [drawingAllowed]);

  return (
    <div className={style.tabs}>
      {children.map((component, index) => {
        return (
          <div
            key={`tabContent${index}`}
            className={`${style.tabContent} ${
              selectedTab == index ? "" : "hidden"
            }`}
          >
            {component}
          </div>
        );
      })}
      <div className={style.tabButtons}>
        {children.map((component, index) => {
          if (component.props.enabledOnlyWhenDrawer) {
            if (drawingToolsIndexRef.current === null) {
              drawingToolsIndexRef.current = index;
            }
          } else if (firstNonDrawingIndexRef.current === null) {
            firstNonDrawingIndexRef.current = index;
          }
          return (
            <button
              key={`tabButton${index}`}
              className={selectedTab === index ? style.selected : ""}
              onClick={() => setSelectedTab(index)}
              disabled={
                component.props.enabledOnlyWhenDrawer && !drawingAllowed
              }
            >
              {component.props.tabButtonText}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Tabs;
