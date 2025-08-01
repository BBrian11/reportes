import React, { useEffect } from 'react';
import * as echarts from 'echarts';

export default function PieChart() {
  useEffect(() => {
    const chart = echarts.init(document.getElementById('pieChart'));
    chart.setOption({
      title: { text: 'Distribución por Tipo', left: 'center' },
      series: [
        {
          type: 'pie',
          radius: '50%',
          data: [
            { value: 10, name: 'TGS' },
            { value: 20, name: 'Edificios' },
            { value: 15, name: 'VTV' }
          ]
        }
      ]
    });
  }, []);

  return <div id="pieChart" style={{ height: '300px' }} className="bg-white rounded-lg shadow p-2"></div>;
}