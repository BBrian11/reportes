import React, { useEffect } from 'react';
import * as echarts from 'echarts';

export default function BarChart() {
  useEffect(() => {
    const chart = echarts.init(document.getElementById('barChart'));
    chart.setOption({
      title: { text: 'Eventos por Día' },
      tooltip: {},
      xAxis: { data: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'] },
      yAxis: {},
      series: [{ type: 'bar', data: [5, 20, 36, 10, 10] }]
    });
  }, []);

  return <div id="barChart" style={{ height: '300px' }} className="bg-white rounded-lg shadow p-2"></div>;
}