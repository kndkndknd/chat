import { default as Express } from "express";
import * as Http from "http";
import { Board, Led } from "johnny-five";

const port = 5050;

const app = Express();
const httpserver = Http.createServer(app).listen(port);

const board = new Board();
let relay = null;
let state: "on" | "off" = "off";
board.on("ready", () => {
  console.log("johnny five relay connected, NC open");
  relay = new Led(13);
  relay.on();

  setTimeout(() => {
    relay.off();
  }, 500);
});

export default app;

app.get("/", function (req, res) {
  console.log("root");
  if (req.on) {
    relay.on();
    state = "on";
  } else if (req.off) {
    relay.off();
    state = "off";
  } else {
    if (state === "on") {
      relay.off();
      state = "off";
    } else {
      relay.on();
      state = "on";
    }
  }
  res.json({ success: true });
});

app.get("/test", function (req, res) {
  console.log("test");
  res.json({ success: true });
});

app.get("/on", function (req, res) {
  console.log("on");
  relay.on();
  state = "on";
  res.json({ success: true });
});

app.get("/off", function (req, res) {
  console.log("off");
  relay.off();
  state = "off";
  res.json({ success: true });
});

app.get("/cramp", function (req, res) {
  relay.on();
  const interval = setInterval(() => {
    relay.off();
    setTimeout(() => {
      relay.on();
    }, 100);
  }, 200);
  setTimeout(() => {
    clearInterval(interval);
    relay.off();
  }, 3000);
  res.json({ success: true });
});
