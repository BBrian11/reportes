import React, { useEffect } from 'react';
import * as echarts from 'echarts';

export default function LineChart() {
  useEffect(() => {
    const chart = echarts.init(document.getElementById('lineChart'));
    chart.setOption({
      title: { text: 'Tendencia Mensual' },
      xAxis: { type: 'category', data: ['Ene', 'Feb', 'Mar', 'Abr', 'May'] },
      yAxis: { type: 'value' },
      series: [{ data: [50, 80, 120, 90, 140], type: 'line' }]
    });
  }, []);

  return <div id="lineChart" style={{ height: '300px' }} className="bg-white rounded-lg shadow p-2"></div>;
}