let interval = -1;
let timeRemaining = 0;
let lastUpdate = -1;

function unpause() {
  lastUpdate = Date.now();
  interval = setInterval(tick, 1000);
}

function pause() {
  clearInterval(interval);
  interval = -1;
}

function tick() {
  const newUpdate = Date.now();
  const dt = newUpdate - lastUpdate;
  lastUpdate = newUpdate;

  timeRemaining -= dt;
  if (timeRemaining <= 0) {
    timeRemaining = 0;
    pause();
  }

  postMessage({ timeRemaining });
}

onmessage = function (e) {
  const { msg, ...args } = e.data;

  if (msg === "start") {
    const { length } = args;
    timeRemaining = length;
    unpause();
  } else if (msg === "pause") {
    pause();
  } else if (msg === "unpause") {
    unpause();
  } else if (msg === "stop") {
    timeRemaining = 0;
    pause();
  }
};
