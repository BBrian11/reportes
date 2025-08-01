import React, { useEffect } from "react";
import * as echarts from "echarts";

export default function EventosChart({ eventos }) {
  useEffect(() => {
    const chartDom = document.getElementById("chart");
    if (!chartDom) return;
    const myChart = echarts.init(chartDom);

    const dataCounts = {};
    eventos.forEach(ev => {
      const key = ev["evento-edificio"] || "Otro";
      dataCounts[key] = (dataCounts[key] || 0) + 1;
    });

    myChart.setOption({
      title: { text: "Eventos por tipo" },
      tooltip: {},
      xAxis: { type: "category", data: Object.keys(dataCounts) },
      yAxis: { type: "value" },
      series: [{ type: "bar", data: Object.values(dataCounts) }]
    });
  }, [eventos]);

  return <div id="chart" style={{ width: "100%", height: "400px" }}></div>;
}
