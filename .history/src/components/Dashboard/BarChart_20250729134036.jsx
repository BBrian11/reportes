// src/components/Dashboard/BarChart.jsx
import React, { useEffect } from "react";
import * as echarts from "echarts";

export default function BarChart({ eventos }) {
  useEffect(() => {
    const chartDom = document.getElementById("barChart");
    const myChart = echarts.init(chartDom);

    const eventCounts = {};
    eventos.forEach((e) => {
      const fecha = e.fecha.split(",")[0];
      eventCounts[fecha] = (eventCounts[fecha] || 0) + 1;
    });

    const labels = Object.keys(eventCounts);
    const values = Object.values(eventCounts);

    myChart.setOption({
      tooltip: { trigger: "axis" },
      xAxis: { type: "category", data: labels },
      yAxis: { type: "value" },
      series: [
        {
          data: values,
          type: "bar",
          itemStyle: { color: "#20B2AA" },
          label: { show: true, position: "top" },
        },
      ],
    });

    return () => myChart.dispose();
  }, [eventos]);

  return <div id="barChart" style={{ height: "300px" }}></div>;
}
