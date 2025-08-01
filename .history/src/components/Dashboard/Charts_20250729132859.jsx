import React, { useEffect } from "react";
import * as echarts from "echarts";

export default function Charts({ eventos }) {
  useEffect(() => {
    const chartDom = document.getElementById("chart");
    const myChart = echarts.init(chartDom);

    const counts = {};
    eventos.forEach((e) => {
      counts[e.evento] = (counts[e.evento] || 0) + 1;
    });

    myChart.setOption({
      title: { text: "Eventos por Tipo", left: "center" },
      xAxis: { type: "category", data: Object.keys(counts) },
      yAxis: { type: "value" },
      series: [{ data: Object.values(counts), type: "bar" }],
    });

    return () => {
      myChart.dispose();
    };
  }, [eventos]);

  return <div id="chart" style={{ height: "300px", width: "100%" }}></div>;
}
