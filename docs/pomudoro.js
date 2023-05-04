const pomuWorker = new Worker("pomu_worker.js");

const NUM_SOUNDS = 14;
const FRAME_LENGTH = 500;
const WORK_GIFS = [
  "baseball.gif",
  "cash.gif",
  "choo_choo.gif",
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

const CLOCKS_HALF_HOURS = [
  "🕛",
  "🕧",
  "🕐",
  "🕜",
  "🕑",
  "🕝",
  "🕒",
  "🕞",
  "🕓",
  "🕟",
  "🕔",
  "🕠",
  "🕕",
  "🕡",
  "🕖",
  "🕢",
  "🕗",
  "🕣",
  "🕘",
  "🕤",
  "🕙",
  "🕥",
  "🕚",
  "🕦",
];
const CLOCKS_HOURS = [
  "🕛",
  "🕐",
  "🕑",
  "🕒",
  "🕓",
  "🕔",
  "🕕",
  "🕖",
  "🕗",
  "🕘",
  "🕙",
  "🕚",
];
const CLOCKS = CLOCKS_HOURS;

const DEFAULT_TITLE = "Pomudoro 🍂 Work with Pomu!";

/*
idle -> working -> done -> resting -> idle
            ^                  ^
            |                  |
            v                  v
        paused             paused
*/
// Settings
const settings = {
  pomudoroLength: 25 * 60 * 1000,
  shortBreakLength: 5 * 60 * 1000,
  longBreakLength: 15 * 60 * 1000,
  cyclesPerLongBreak: 4,
};

const SETTING_DEFS = {
  pomudoroLength: {
    name: "Pomudoro length",
    unit: 60 * 1000,
    step: 5,
    setEffect: handleChangeTimeSetting,
  },
  shortBreakLength: {
    name: "Short break length",
    unit: 60 * 1000,
    step: 5,
    setEffect: handleChangeTimeSetting,
  },
  longBreakLength: {
    name: "Long break length",
    unit: 60 * 1000,
    step: 5,
    setEffect: handleChangeTimeSetting,
  },
  cyclesPerLongBreak: {
    name: "Pomudoros per long break",
    unit: 1,
    step: 1,
  },
};

// State
let state = "idle";
let cycles = 0;
let timeRemaining = settings.pomudoroLength;
let totalTime = settings.pomudoroLength;
let paused = false;

/*
=================
Utility Functions
=================
*/
function log(event) {
  if (window.umami) {
    try {
      umami(event);
    } catch {}
  }
}

function pad(num) {
  if (num < 10) {
    return `0${num}`;
  }
  return `${num}`;
}

function formatTime(time) {
  const seconds = time / 1000;
  // TODO: assumes it's never an hour
  return `${pad(Math.floor(seconds / 60))}:${pad(Math.floor(seconds) % 60)}`;
}

/*
======================
Cycle State Management
======================
*/
function unpause() {
  pomuWorker.postMessage({ msg: "unpause" });
  paused = false;
  updateInterface();
}

function pause() {
  pomuWorker.postMessage({ msg: "pause" });
  paused = true;
  updateInterface();
}

function start(timerLength) {
  timeRemaining = timerLength;
  totalTime = timerLength;
  pomuWorker.postMessage({ msg: "start", length: timerLength });
  updateInterface();
}

function stop(nextCycleTime) {
  pomuWorker.postMessage({ msg: "stop" });
  timeRemaining = nextCycleTime;
  totalTime = nextCycleTime;
  drawCountdown();
  updateInterface();
}

function transitionState() {
  if (state === "idle") {
    state = "working";
  } else if (state === "working") {
    state = "done";
  } else if (state === "done") {
    state = "resting";
  } else if (state === "resting") {
    state = "idle";
  }
  // Because GIFs are selected randomly, we only want to set it once,
  // so we do it at the same time as the state transition.
  updateInterface();
  setGif();
}

function completeSegment() {
  imPomu();

  // If the user clicked skip when paused
  paused = false;

  // Clean up timer & draw
  if (state === "working") {
    if (nextBreakIsLong()) {
      stop(settings.longBreakLength);
    } else {
      stop(settings.shortBreakLength);
    }
  } else if (state === "resting") {
    stop(settings.pomudoroLength);
    cycles += 1;
  }

  transitionState();
}

function startBreak() {
  if (nextBreakIsLong()) {
    log("Start Long Break");
    start(settings.longBreakLength);
  } else {
    log("Start Short Break");
    start(settings.shortBreakLength);
  }
}

function nextBreakIsLong() {
  if ((cycles + 1) % settings.cyclesPerLongBreak === 0) {
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
    document.title = DEFAULT_TITLE;
  } else if (state === "working") {
    skipButton.classList.add("show");
    flavor.innerText = "Pomu is working";
    if (!paused) {
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
    document.title = DEFAULT_TITLE;
  } else if (state === "resting") {
    flavor.innerText = "Pomu is resting";
    skipButton.classList.add("show");
    if (!paused) {
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
  document.title = `${formatted} 🍂 Pomudoro`;
}

function drawFavicon() {
  const percentDone = (totalTime - timeRemaining) / totalTime;
  const clock = Math.floor(percentDone * CLOCKS.length);
  document.querySelector(`link[rel="icon"]`).href = `
      data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${CLOCKS[clock]}</text></svg>
  `;
}

pomuWorker.onmessage = function (e) {
  const { timeRemaining: dTimeRemaining } = e.data;
  timeRemaining = dTimeRemaining;
  drawCountdown();
  drawFavicon();
  if (timeRemaining <= 0) {
    completeSegment();
  }
};

function setGif() {
  let gif = IDLE_GIF;
  let favicon = null;
  if (state === "idle") {
    gif = IDLE_GIF;
    favicon = "🍅";
  } else if (state === "working") {
    gif = WORK_GIFS[Math.floor(Math.random() * WORK_GIFS.length)];
    favicon = CLOCKS[0];
  } else if (state === "done") {
    gif = DONE_GIF;
    favicon = "💤";
  } else if (state === "resting") {
    gif = REST_GIF;
    favicon = CLOCKS[0];
  }
  document.getElementById("pomu").src = `gifs/${gif}`;
  document.querySelector(
    `link[rel="icon"]`
  ).href = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${favicon}</text></svg>`;
}

/*
===============
Button Handlers
===============
*/
function startstop() {
  if (state === "idle") {
    log("Start Pomudoro");
    transitionState();
    start(settings.pomudoroLength);
  } else if (state === "working" || state === "resting") {
    if (!paused) {
      pause();
    } else {
      unpause();
    }
  } else if (state === "done") {
    transitionState();
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
/**
 * @param {keyof typeof settings} settingKey
 */
function decreaseNumericSetting(settingKey) {
  const { unit, step, setEffect } = SETTING_DEFS[settingKey];
  if (settings[settingKey] > unit) {
    // TODO: Snap
    settings[settingKey] -= unit * step;
    // Re-render
    document.getElementById(settingKey).value = Math.floor(
      settings[settingKey] / unit
    );
    setEffect();
  }
}

/**
 * @param {keyof typeof settings} settingKey
 */
function increaseNumericSetting(settingKey) {
  const { unit, step, setEffect } = SETTING_DEFS[settingKey];
  settings[settingKey] += unit * step;
  // Re-render
  document.getElementById(settingKey).value = Math.floor(
    settings[settingKey] / unit
  );
  setEffect();
}

/**
 * @param {keyof typeof settings} settingKey
 */
function changeNumericSetting(settingKey) {
  const { unit, setEffect } = SETTING_DEFS[settingKey];
  const value = parseInt(document.getElementById(settingKey).value);
  settings[settingKey] = value * unit;
  setEffect();
}

function handleChangeTimeSetting() {
  if (state === "idle" && timeRemaining === totalTime) {
    timeRemaining = settings.pomudoroLength;
    totalTime = settings.pomudoroLength;
  } else if (state === "done" && timeRemaining === totalTime) {
    if (nextBreakIsLong()) {
      timeRemaining = settings.longBreakLength;
      totalTime = settings.longBreakLength;
    } else {
      timeRemaining = settings.shortBreakLength;
      totalTime = settings.shortBreakLength;
    }
  }
  drawCountdown();
}

// TODO: redraw interface if relevant setting changes

function addNumericSetting(settingKey) {
  const { name, step, unit } = SETTING_DEFS[settingKey];
  const fieldset = document.createElement("fieldset");
  document.getElementById("settings").appendChild(fieldset);

  const legend = document.createElement("legend");
  legend.innerText = name;
  fieldset.appendChild(legend);

  const fieldControls = document.createElement("div");
  fieldControls.classList.add("numericControl");
  fieldset.appendChild(fieldControls);

  const decreaseButton = document.createElement("button");
  decreaseButton.innerText = "-";
  decreaseButton.classList.add("numAdjust");
  decreaseButton.onclick = () => decreaseNumericSetting(settingKey);
  fieldControls.appendChild(decreaseButton);

  const input = document.createElement("input");
  input.setAttribute("type", "number");
  input.setAttribute("id", settingKey);
  input.setAttribute("min", "1");
  input.setAttribute("step", `${step}`);
  input.value = `${Math.floor(settings[settingKey] / unit)}`;
  input.onchange = () => changeNumericSetting(settingKey);
  fieldControls.appendChild(input);

  const increaseButton = document.createElement("button");
  increaseButton.innerText = "+";
  increaseButton.classList.add("numAdjust");
  increaseButton.onclick = () => increaseNumericSetting(settingKey);
  fieldControls.appendChild(increaseButton);
}

function addSettings() {
  for (const setting of [
    "pomudoroLength",
    "shortBreakLength",
    "longBreakLength",
    "cyclesPerLongBreak",
  ]) {
    addNumericSetting(setting);
  }
}

/*
==============
Initial render
==============
*/
document.addEventListener("DOMContentLoaded", function () {
  drawCountdown();
  updateInterface();
  setGif();
  addSettings();
});
