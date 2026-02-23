// hls.js
import Hls from "hls.js";

export const hlsVideoPlay = (m3u8Name: string) => {
  console.log(m3u8Name);
  const hlsVideo = document.getElementById("hls") as HTMLVideoElement;
  const hlsVideoSource = `https://localhost:8000/hls/${m3u8Name}/${m3u8Name}.m3u8`;
  // const hlsVideoSource = "https://localhost:8000/hls/Nature.m3u8";
  hlsVideo.style.display = "block";
  console.log("played", hlsVideo.played);
  console.log("paused", hlsVideo.paused);
  console.log("ended", hlsVideo.ended);
  const originalSize = { width: hlsVideo.width, height: hlsVideo.height };
  const width =
    (window.innerWidth * Math.random() * 2) / 3 + window.innerWidth / 3;
  const height = (width * originalSize.height) / originalSize.width;
  const left = (window.innerWidth - width) * Math.random();
  const top = (window.innerHeight - height) * Math.random();
  let degree = 0;
  let randomize = Math.random();
  if (randomize > 0.75) {
    degree = 90;
  } else if (randomize > 0.5) {
    degree = -90;
  }

  hlsVideo.width = width;
  hlsVideo.height = height;
  hlsVideo.style.top = String(top) + "px";
  hlsVideo.style.left = String(left) + "px";
  hlsVideo.style.transform = `rotate(${degree}deg)`;

  const canvasSize = {
    width: width,
    height: height,
    left: (window.innerWidth - width) * Math.random(),
    top: (window.innerHeight - height) * Math.random(),
    degree: degree,
  };
  const cnvsElement = <HTMLCanvasElement>document.getElementById("cnvs");
  cnvsElement.setAttribute("height", String(canvasSize.height) + "px");
  cnvsElement.setAttribute("width", String(canvasSize.width) + "px");
  cnvsElement.style.top = String(canvasSize.top) + "px";
  cnvsElement.style.left = String(canvasSize.left) + "px";
  cnvsElement.style.transform = `rotate(${canvasSize.degree}deg)`;
  const bckcnvsElement = <HTMLCanvasElement>document.getElementById("bckcnvs");
  bckcnvsElement.setAttribute("height", String(canvasSize.height) + "px");
  bckcnvsElement.setAttribute("width", String(canvasSize.width) + "px");
  bckcnvsElement.style.top = String(canvasSize.top) + "px";
  bckcnvsElement.style.left = String(canvasSize.left) + "px";
  bckcnvsElement.style.transform = `rotate(${canvasSize.degree}deg)`;

  // hlsVideo.style.rotate = String(degree) + "deg";

  if (Hls.isSupported()) {
    console.log("hls is supported");
    if (hlsVideo.played.length === 0) {
      console.log("not paused");
      const hls = new Hls();
      hls.loadSource(hlsVideoSource);
      hls.attachMedia(hlsVideo);
      hlsVideo.play();
    } else {
      console.log("played");
      hlsVideo.play();
    }
    // hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
    //   console.log("manifest loaded, found " + data.levels.length + " quality level");
    // });
  } else if (hlsVideo.canPlayType("application/vnd.apple.mpegurl")) {
    console.log("apple.mpegurl");
    hlsVideo.src = hlsVideoSource;
    hlsVideo.addEventListener("loadedmetadata", function () {
      hlsVideo.play();
    });
  }
};

export const hlsSizing = () => {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const width = String(windowWidth);
  const height = String(windowHeight);
  console.log(width);
  console.log(height);
  const cnvsElement = <HTMLCanvasElement>document.getElementById("hls");
  cnvsElement.setAttribute("height", height + "px");
  cnvsElement.setAttribute("width", width + "px");
};

export const hlsVideoStop = () => {
  const hlsVideo = document.getElementById("hls") as HTMLVideoElement;
  if (hlsVideo.played) {
    hlsVideo.pause();
    hlsVideo.style.display = "none";
  }
};
