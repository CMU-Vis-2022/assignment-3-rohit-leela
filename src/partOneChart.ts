import * as d3 from "d3";
import { db } from "./duckdb";
import parquet from "./pittsburgh.parquet?url";

const res = await fetch(parquet);

await db.registerFileBuffer(
  "pittsburgh.parquet",
  new Uint8Array(await res.arrayBuffer())
);

const conn = await db.connect();

export function PartOneChart() {
  let selectedStation = "Avalon";
  const ChartMargin = { top: 30, right: 30, bottom: 30, left: 50 };
  const chartW = document.body.clientWidth * 0.85;
  const chartH = 300;

  const xChartRange = [ChartMargin.left, chartW - ChartMargin.right];
  const yChartRange = [ChartMargin.top, chartH - ChartMargin.bottom];

  const xChart = d3.scaleLinear().range(xChartRange);
  const yChart = d3.scaleLinear().range(yChartRange);

  const xAxis = d3.axisTop(xChart).ticks(chartW / 80);
  const yAxis = d3.axisLeft(yChart).tickSizeOuter(0);

  const svgChart = d3
    .create("svg")
    .attr("width", chartW)
    .attr("height", chartH)
    .attr("viewBox", [0, 0, chartW, chartH])
    .attr("style", "max-width: 100%; height: auto; height: intrinsic; ");

  const focus = svgChart.append("g").attr("class", "focus").style("display", "none");


  function ChangeStation(data: any, data2: string | any[], raw: unknown[] | Iterable<unknown> | d3.ValueFn<SVGGElement, undefined, unknown[] | Iterable<unknown>>, showRawData: any, station: string) {
    selectedStation = station;

    yChart.domain([160, 0]);
    xChart.domain([2016, 2023]);

    svgChart.selectAll("*").remove();

    const heightratio = (yChartRange[1] - 30) / 160;

    svgChart
      .append("rect")
      .attr("x", 50)
      .attr("y", 30 )
      .attr("width", chartW)
      .attr("height", 10 * heightratio)
      .attr("fill", "#f65e5f7d");
    
    svgChart
      .append("rect")
      .attr("x", 50)
      .attr("y", 30  * heightratio)
      .attr("width", chartW)
      .attr("height", 50 * heightratio)
      .attr("fill", "#f990497d");
    
    svgChart
      .append("rect")
      .attr("x", 50)
      .attr("y", 30 + 30 * heightratio * 2)
      .attr("width", chartW)
      .attr("height", 50 * heightratio)
      .attr("fill", "#facf397d");
    
  
    svgChart
      .append("rect")
      .attr("x", 50)
      .attr("y", 30 + 36.5 * heightratio * 3)
      .attr("width", chartW)
      .attr("height", 50 * heightratio)
      .attr("fill", "#9cd84e7d");
    
    svgChart
      .append("g")
      .attr("class", "yaxis")
      .attr("transform", `translate(${ChartMargin.left},0)`);
    
  svgChart
    .append("g")
    .attr("class", "xaxis")
    .attr("transform", `translate(0, ${chartH - ChartMargin.bottom})`);
    
    svgChart.select(".xaxis").call(xAxis);

    svgChart
      .select(".yaxis")
      .call(yAxis)
      .call((g) =>
        g
          .selectAll(".tick line")
          .clone()
          .attr("x2", chartW - ChartMargin.top - ChartMargin.bottom)
          .attr("stroke-opacity", 0.2)
      );

    const line = d3
      .line()
      .x(function (d) {
        return xChart(d.year + d.month / 12);
      })
      .y(function (d) {
        return yChart(d.aqi);
      });

    svgChart
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "black")
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
      .attr("stroke-width", 1.5)
      .attr("d", line);


    const area = d3
      .area()
      .x(function (i) {
        return xChart(data2[i].year + data2[i].month / 12);
      })
      .y0(function (i) {
        return yChart(data2[i].iqr.get(0));
      })
      .y1(function (i) {
        return yChart(data2[i].iqr.get(1));
      });

    const I = d3.range(data2.length);

    svgChart.append("path").attr("fill", "#0000003d").attr("d", area(I));

    if (showRawData) {
      svgChart
        .append("g")
        .selectAll("dot")
        .data(raw)
        .enter()
        .append("circle")
        .attr("cx", function (d) {
          return xChart(d.year + ((d.month - 1) * 30 + d.day) / 365);
        })
        .attr("cy", function (d) {
          return yChart(d.aqi);
        })
        .attr("r", 1)
        .style("fill", "#000000");
    }

    svgChart
      .append("rect")
      .attr("width", chartW)
      .attr("height", chartH)
      .style("fill", "none")
      .style("pointer-events", "all")
      .on("mouseover", () => {
        focus.style("display", null);
      })
      .on("mouseout", () => {
        focus.style("display", "none");
      })
      .on("touchmove mousemove", mouseMove);
  }



  async function mouseMove(event: { x: number; }) {
    d3.selectAll(".focus").remove();

    const mouseEventCord = event.x - 58; 

    const year = Math.floor((mouseEventCord - 50) / 99 + 2016);
    const month = Math.floor(((mouseEventCord - 50) % 99) / 8.5) + 1;

  svgChart
    .append("line")
    .attr("class", "focus")
    .style("stroke", "black")
    .style("stroke-width", 1)
    .attr("x1", mouseEventCord)
    .attr("y1", 30)
    .attr("x2", mouseEventCord)
    .attr("y2", chartH - 30);

  svgChart
    .append("text")
    .attr("class", "focus")
    .attr("x", mouseEventCord + 1)
    .attr("y", chartH / 2)
    .attr("dy", ".25em")
    .text(year + "-" + month + "-" + 15);

    const aqiValue =
      await conn.query(`
      SELECT month("Timestamp(UTC)")::int as month, year("Timestamp(UTC)")::int as year, avg("US AQI")::double as aqi
      FROM pittsburgh.parquet
      WHERE "Station name" = '${selectedStation}'
      and month("Timestamp(UTC)") = '${month}'
      and year("Timestamp(UTC)") = '${year}'
      GROUP BY month, year`);

    const avg = aqiValue.get(0).aqi;

    svgChart
      .append("text")
      .attr("class", "focus")
      .attr("x", mouseEventCord)
      .attr("y", chartH / 2 + 20)
      .attr("dy", ".25em")
      .text("Mean US AQI " + Math.floor(avg));
  }

  return {
    element: svgChart.node(),
    ChangeStation: ChangeStation,
  };
}
