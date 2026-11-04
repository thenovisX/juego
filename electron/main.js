// Envoltorio de escritorio: abre el juego en una ventana propia (base para Steam).
const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 860,
    backgroundColor: "#0b141d",
    title: "Hegemonía",
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, "..", "index.html"));
  win.webContents.on("before-input-event", (_e, input) => {
    if (input.key === "F11" && input.type === "keyDown") win.setFullScreen(!win.isFullScreen());
  });
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
