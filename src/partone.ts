import "./style.css";
import * as d3 from "d3";
import { PartOneChart } from "./partOneChart";
import { db } from "./duckdb";
import parquet from "./pittsburgh.parquet?url";
import { data } from "./RawData";

const app = document.querySelector("#apppartone")!;

let currentStation = "Avalon";
let isRaw = false;

const line = PartOneChart();
const res = await fetch(parquet);
await db.registerFileBuffer( 
  "pittsburgh.parquet",
  new Uint8Array(await res.arrayBuffer())
);

const DbConn = await db.connect();
const AllStations = [...new Set(data.map((item) => item.station))];

const select = d3.select(app).append("select");


for (const station of AllStations) {
  select.append("option").text(station);
}

select.on("change", () => {
  currentStation = select.property("value");
  updateChart(currentStation);
});

updateChart(currentStation);

app.appendChild(line.element);

d3.select("#rawDatatoggle").on("change", () => {
  isRaw = !isRaw;
  updateChart(currentStation);
});

async function updateChart(value: string) {
  const station = value

  const DbData = await DbConn.query(`
  SELECT month("Timestamp(UTC)")::int as month, year("Timestamp(UTC)")::int as year, avg("US AQI")::double as aqi
  FROM pittsburgh.parquet
  WHERE "Station name" = '${station}'
  GROUP BY month, year
  ORDER BY year, month Asc`);
  
  const DbData2 = await DbConn.query(`
   select iqr, month, year from (
   select quantile_cont("US AQI", [0.1, 0.9]) over ( PARTITION BY month("Timestamp(UTC)"), year("Timestamp(UTC)") ) as iqr, 
     month("Timestamp(UTC)")::int as month, year("Timestamp(UTC)")::int as year
     from pittsburgh.parquet 
     WHERE "Station name" = '${station}') 
     group by 1,2,3
     ORDER BY year, month Asc`);

  const DbData3 = await DbConn.query(`
    SELECT day("Timestamp(UTC)")::int as day, month("Timestamp(UTC)")::int as month, year("Timestamp(UTC)")::int as year, "US AQI" as aqi
    FROM pittsburgh.parquet
    WHERE "Station name" = '${station}'
    ORDER BY year, month, day Asc`);

  const dataArray = [];
  const dataArray2 = [];
  const dataArray3 = [];

  for (const data of DbData) {
    dataArray.push({ ...data });
  }

  for (const data of DbData2) {
    dataArray2.push({ ...data });
  }

  for (const data of DbData3) {
    dataArray3.push({ ...data });
  }

  line.ChangeStation(dataArray, dataArray2, dataArray3, isRaw, station);
}
