// src/components/Dashboard/PieChart.jsx
import React, { useEffect } from "react";
import * as echarts from "echarts";

export default function PieChart({ eventos }) {
  useEffect(() => {
    const chartDom = document.getElementById("pieChart");
    const myChart = echarts.init(chartDom);

    const eventCounts = {};
    eventos.forEach((e) => {
      eventCounts[e.evento] = (eventCounts[e.evento] || 0) + 1;
    });

    const data = Object.keys(eventCounts).map((key) => ({
      name: key,
      value: eventCounts[key],
    }));

    myChart.setOption({
      tooltip: { trigger: "item" },
      series: [
        {
          type: "pie",
          radius: ["40%", "70%"],
          avoidLabelOverlap: false,
          label: { show: true, formatter: "{b}: {c}" },
          data: data,
        },
      ],
    });

    return () => myChart.dispose();
  }, [eventos]);

  return <div id="pieChart" style={{ height: "300px" }}></div>;
}
