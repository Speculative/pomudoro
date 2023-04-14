const NUM_SOUNDS = 14;
const FRAME_LENGTH = 500;
const WORK_GIFS = [
  "baseball.gif",
  "cash.gif",
  "choo_choo.gif",
  "cursed_pizza.gif",
  "cyclone.gif",
  "jump_rope.gif",
  "kecha.gif",
  "pomu.gif",
  "pomutori.gif",
  "skate.gif",
  "sword.gif",
];
const IDLE_GIF = "pomuJAM.gif";
const DONE_GIF = "ppbirthday2021.gif";
const REST_GIF = "cursed_pizza.gif";

/*
idle -> working -> done -> resting -> idle
            ^                  ^
            |                  |
            v                  v
        paused             paused
*/
// Settings
let pomudoroLength = 25 * 60;
let shortBreakLength = 5 * 60;
let longBreakLength = 15 * 60;
let cyclesPerLongBreak = 4;

// State
let state = "idle";
let cycles = 0;
let timeRemaining = pomudoroLength;
let interval = -1;

/*
=================
Utility Functions
=================
*/
function pad(num) {
  if (num < 10) {
    return `0${num}`;
  }
  return `${num}`;
}

function log(event) {
  if (window.umami) {
    try {
      umami(event);
    } catch {}
  }
}

function formatTime(time) {
  // TODO: assumes it's never an hour
  return `${pad(Math.floor(time / 60))}:${pad(Math.floor(time) % 60)}`;
}

/*
======================
Cycle State Management
======================
*/
function unpause() {
  interval = setInterval(tick, 1000);
  updateInterface();
}

function pause() {
  clearInterval(interval);
  interval = -1;
  updateInterface();
}

function start(timerLength) {
  timeRemaining = timerLength;
  drawCountdown();
  updateInterface();
  setGif();
  unpause();
}

function stop(nextCycleTime) {
  clearInterval(interval);
  interval = -1;
  timeRemaining = nextCycleTime;
  drawCountdown();
  updateInterface();
}

function completeSegment() {
  imPomu();
  if (state === "working") {
    if (nextBreakIsLong()) {
      stop(longBreakLength);
    } else {
      stop(shortBreakLength);
    }

    state = "done";
    updateInterface();
    setGif();
  } else if (state === "resting") {
    stop(pomudoroLength);

    cycles += 1;
    state = "idle";
    updateInterface();
    setGif();
  }
}

function startBreak() {
  if (nextBreakIsLong()) {
    log("Start Long Break");
    start(longBreakLength);
  } else {
    log("Start Short Break");
    start(shortBreakLength);
  }
}

function nextBreakIsLong() {
  if ((cycles + 1) % cyclesPerLongBreak === 0) {
    return true;
  } else {
    return false;
  }
}

function updateInterface() {
  const startStopButton = document.getElementById("startstop");
  const skipButton = document.getElementById("skip");
  const flavor = document.getElementById("flavor");

  if (state === "idle") {
    startStopButton.innerText = "Start Pomudoro";
    skipButton.classList.remove("show");
    flavor.innerText = "Pomu is idle";
  } else if (state === "working") {
    skipButton.classList.add("show");
    flavor.innerText = "Pomu is working";
    if (interval !== -1) {
      startStopButton.innerText = "Pause Pomudoro";
    } else {
      startStopButton.innerText = "Resume Pomudoro";
    }
  } else if (state === "done") {
    flavor.innerText = "Pomu is done!";
    if (nextBreakIsLong()) {
      startStopButton.innerText = "Start Long Break";
    } else {
      startStopButton.innerText = "Start Short Break";
    }
    skipButton.classList.remove("show");
  } else if (state === "resting") {
    flavor.innerText = "Pomu is resting";
    skipButton.classList.add("show");
    if (interval !== -1) {
      if (nextBreakIsLong()) {
        startStopButton.innerText = "Pause Long Break";
      } else {
        startStopButton.innerText = "Pause Short Break";
      }
    } else {
      if (nextBreakIsLong()) {
        startStopButton.innerText = "Resume Long Break";
      } else {
        startStopButton.innerText = "Resume Short Break";
      }
    }
  }
}

/*
===================
Interface rendering
===================
*/
function imPomu() {
  const audio = new Audio(
    `sounds/pomu${pad(Math.floor(Math.random() * NUM_SOUNDS))}.mp3`
  );
  audio.play();
}

function drawCountdown() {
  const formatted = formatTime(timeRemaining);
  document.getElementById("countdown").textContent = formatted;
}

function tick() {
  timeRemaining -= 1;
  drawCountdown();
  if (timeRemaining <= 0 && interval !== -1) {
    completeSegment();
  }
}

document.addEventListener("DOMContentLoaded", function () {
  drawCountdown();
  updateInterface();
});

function setGif() {
  let gif = IDLE_GIF;
  if (state === "idle") {
    pomu.src = `gifs/${IDLE_GIF}`;
  } else if (state === "working") {
    gif = WORK_GIFS[Math.floor(Math.random() * WORK_GIFS.length)];
  } else if (state === "done") {
    gif = DONE_GIF;
  } else if (state === "resting") {
    gif = REST_GIF;
  }
  document.getElementById("pomu").src = `gifs/${gif}`;
}

/*
===============
Button Handlers
===============
*/
function startstop() {
  if (state === "idle") {
    log("Start Pomudoro");
    state = "working";
    updateInterface();
    setGif();
    start(pomudoroLength);
  } else if (state === "working" || state === "resting") {
    if (interval !== -1) {
      pause();
    } else {
      unpause();
    }
  } else if (state === "done") {
    state = "resting";
    setGif();
    startBreak();
  }
}

function skip() {
  completeSegment();
}

/*
===================
Settings management
===================
*/
