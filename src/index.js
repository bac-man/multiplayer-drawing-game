import ReactDOM from "react-dom/client";
import GameContainer from "./components/gameContainer";
import "./style/global.css";

const container = document.getElementById("root");
const root = ReactDOM.createRoot(container);
const ws = new WebSocket("ws://192.168.0.104:3001");
root.render(<GameContainer ws={ws} />);
