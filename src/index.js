import ReactDOM from "react-dom/client";
import GameContainer from "./components/gameContainer/gameContainer";
import "./style/global.css";

const container = document.getElementById("root");
const root = ReactDOM.createRoot(container);
root.render(<GameContainer />);
