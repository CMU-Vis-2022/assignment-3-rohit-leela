import "./style.css";
import * as d3 from "d3";

import { data } from "./RawData";
import moment from "moment";
import { Calendar } from "./partTwoCalendar";
const app = document.querySelector("#app")!;

const cities = [...new Set(data.map((item) => item.city))];

var chart = Calendar(
  data
    .filter((x) => x.city === cities[0])
    .sort(
      (a, b) =>
        moment(b, "DD-MM-YYYY").toDate() - moment(a, "DD-MM-YYYY").toDate()
    ),
  {
    x: (d) => d.time,
    y: (d) => d.aqi,
    yFormat: "+%", // show percent change on hover
    weekday: "weekday",
    width: 928,
  }
);

const select = d3.select(app).append("select");

for (const location of cities) {
  select.append("option").text(location);
}

select.on("change", () => {
  const location = select.property("value");
  const newChart = Calendar(
    data
      .filter((x) => x.city === location)
      .sort(
        (a, b) =>
          moment(b, "DD-MM-YYYY").toDate() - moment(a, "DD-MM-YYYY").toDate()
      ),
    {
      x: (d) => d.time,
      y: (d) => d.aqi,
      yFormat: "+%", // show percent change on hover
      weekday: "weekday",
      width: 928,
    }
  );
  app.replaceChild(newChart.element, chart.element);
  chart = newChart;
});
// Add the chart to the DOM.
app.appendChild(chart.element);
