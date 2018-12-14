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
function scale_r(value, oldMin, oldMax, newMin, newMax) {
  return Math.round(scale(value, oldMin, oldMax, newMin, newMax));
}

function createTask(task, index, viewport) {
  const start = scale(task.start, viewport.start, viewport.end, 0, width);
  const end = scale(task.end, viewport.start, viewport.end, 0, width);

  return `
    <g transform="translate(${start}, ${index * 36})">
        <rect fill="#AAE"  x="0" y="0" width="${end -
          start}" height="32"></rect>
        <text fill="#333" font-size='16' x="4" y="16" alignment-baseline="central" font-weight='600'>${
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

function generateMonthDiff(viewport) {
  let d = new Date(viewport.start);
  d.setDate(1);
  let months = [];
  while (d.getTime() <= new Date(viewport.end).getTime()) {
    months.push(new Date(d.getTime()));
    d.setMonth(d.getMonth() + 1);
    d.setDate(1);
  }
  return months;
}
function daysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}
let width = 960;
let height = 300;
let margin = {
  top: 32,
  bottom: 16
};
const oneMonth = 30;

app.get("/:text/gantt.svg", (req, res) => {
  let viewport = {
    start: getRelativeDate(-1 * oneMonth).getTime(),
    end: getRelativeDate(3 * oneMonth).getTime()
  };

  res.set("Content-Type", svgContent);
  const tasks = req.param("text").split("\n");
  height = tasks.length * 32 + margin.top + margin.bottom;

  const taskHtml = tasks
    .map((i, idx) => createTask(parse(i), idx, viewport))
    .join("\n");
  const today = scale(
    new Date().getTime(),
    viewport.start,
    viewport.end,
    0,
    width
  );

  //generate month line
  let monthDiffs = generateMonthDiff(viewport);
  let monthsHtml = monthDiffs
    .map(month => {
      let dx = scale(month.getTime(), viewport.start, viewport.end, 0, width);

      return `
      <g transform="translate(${dx}, 0)">
        <text  fill="#333" font-size='16' x="4" y="16" alignment-baseline="top" >${month.getMonth() +
          1}月</text>
        <line stroke="#999" stroke-width="2" x1="0" y1="0" x2="0" y2="${height}"></line>
      </g>
    `;
    })
    .join("\n");

  //generate week background
  let weeks = [];
  let d = new Date(viewport.start);
  resetHMS(d);
  while (d.getTime() <= new Date(viewport.end).getTime()) {
    if (d.getDay() === 0) {
      weeks.push(new Date(d.getTime()));
    }
    d.setDate(d.getDate() + 1);
  }
  let ranges = [];

  for (let i = 0; i < weeks.length - 1; i += 2) {
    ranges.push({
      start: weeks[i],
      end: weeks[i + 1]
    });
  }

  const weeksHtml = ranges
    .map(range => {
      let s = scale(
        range.start.getTime(),
        viewport.start,
        viewport.end,
        0,
        width
      );
      let e = scale(
        range.end.getTime(),
        viewport.start,
        viewport.end,
        0,
        width
      );
      return `
      <rect fill="#F8F8F8" x="${s}" y="0" width="${e -
        s}" height="${height}"></rect>
    `;
    })
    .join("\n");

  res.send(`
<svg
    xmlns='http://www.w3.org/2000/svg'
    xmlns:xlink='http://www.w3.org/1999/xlink'
    version='1.1'
    width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background: #EEE;">
    <g>
    ${weeksHtml}
    </g>

    <g>
    ${monthsHtml}
    </g>

    <line stroke="red" x1="${today}" y1="0" x2="${today}" y2="${height}"></line>
    <g transform="translate(0, ${margin.top})">
    ${taskHtml}
    </g>
</svg>
`);
});

exports.render = functions.https.onRequest(app);
