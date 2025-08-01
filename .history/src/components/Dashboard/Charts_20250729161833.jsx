import React from 'react';
import BarChart from './BarChart.jsx';
import PieChart from './PieChart.jsx';
import LineChart from './LineChart.jsx';

export default function Charts() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
      <BarChart />
      <PieChart />
      <LineChart />
    </div>
  );
}