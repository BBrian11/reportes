// src/components/Dashboard/LineChart.jsx
import React, { useEffect } from "react";
import * as echarts from "echarts";

export default function LineChart({ eventos }) {
  useEffect(() => {
    const chartDom = document.getElementById("lineChart");
    const myChart = echarts.init(chartDom);

    const dateCounts = {};
    eventos.forEach((e) => {
      const fecha = e.fecha.split(",")[0];
      dateCounts[fecha] = (dateCounts[fecha] || 0) + 1;
    });

    const labels = Object.keys(dateCounts);
    const values = Object.values(dateCounts);

    myChart.setOption({
      tooltip: { trigger: "axis" },
      xAxis: { type: "category", data: labels },
      yAxis: { type: "value" },
      series: [
        {
          data: values,
          type: "line",
          smooth: true,
          itemStyle: { color: "#FF6F61" },
        },
      ],
    });

    return () => myChart.dispose();
  }, [eventos]);

  return <div id="lineChart" style={{ height: "300px" }}></div>;
}
