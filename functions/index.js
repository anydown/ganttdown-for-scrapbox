const functions = require("firebase-functions");

const app = require("express")();
const svgContent = "image/svg+xml; charset=utf-8";

function resetHMS(d) {
  d.setHours(0);
  d.setMinutes(0);
  d.setSeconds(0);
  d.setMilliseconds(0);
  return d;
}
function resetHMSfromEpoc(epoc) {
  return resetHMS(new Date(epoc)).getTime();
}
function roundHMSfromEpoc(epoc) {
  return resetHMS(new Date(epoc + (24 * 60 * 60 * 1000) / 2)).getTime();
}
function getRelativeDate(day) {
  let d = new Date();
  resetHMS(d);
  d.setDate(d.getDate() + day);
  return d;
}
function getNewDate(str, offset) {
  let d = new Date(str);
  resetHMS(d);
  if (offset !== undefined) {
    d.setDate(d.getDate() + offset);
  }
  return d;
}

function scale(value, oldMin, oldMax, newMin, newMax) {
  return ((value - oldMin) * (newMax - newMin)) / (oldMax - oldMin) + newMin;
}

function createTask(task, index, viewport) {
  const start = scale(task.start, viewport.start, viewport.end, 0, width);
  const end = scale(task.end, viewport.start, viewport.end, 0, width);

  return `
    <g transform="translate(${start}, ${index * 36})">
        <rect fill="#AAE"  x="0" y="0" width="${end -
          start}" height="32"></rect>
        <text fill="#333" font-size='20' x="4" y="16" alignment-baseline="central" font-weight='600'>${
          task.label
        }</text>
    </g>
      `;
}

function parse(line) {
  const split = line.split(" ");
  return {
    start: getNewDate(split[0], 0).getTime(),
    end: getNewDate(split[1], 0).getTime(),
    label: split[2]
  };
}
let width = 600;

app.get("/:text/gantt.svg", (req, res) => {
  let viewport = {
    start: getRelativeDate(-7).getTime(),
    end: getRelativeDate(7 * 3).getTime()
  };

  res.set("Content-Type", svgContent);
  const taskHtml = req
    .param("text")
    .split("\n")
    .map((i, idx) => createTask(parse(i), idx, viewport))
    .join("\n");
  const today = scale(
    new Date().getTime(),
    viewport.start,
    viewport.end,
    0,
    width
  );

  let startDate = getRelativeDate(-7)
  let days = []
  for(let i = 0; i <  7*4; i++){
      startDate.setDate(startDate.getDate() + 1)
      days.push(new Date(startDate.getTime()))
  }

  function dHtml(){
      
  }

  let daysHtml = days.map(d=>`d`)

  res.send(`
<svg
    xmlns='http://www.w3.org/2000/svg'
    xmlns:xlink='http://www.w3.org/1999/xlink'
    version='1.1'
    width="${width}" height="300" viewBox="0 0 ${width} 300" style="background: #EEE;">

    <g transform="translate(0, 32)">
    ${taskHtml}
    </g>

    <line stroke="red" x1="${today}" y1="0" x2="${today}" y2="300"></line>
</svg>
`);
});

exports.render = functions.https.onRequest(app);
