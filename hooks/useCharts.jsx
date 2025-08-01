export default function useCharts(events) {
  const aggregateData = () => {
    const typeCount = {};
    events.forEach((ev) => {
      const type = ev.evento || 'Otro';
      typeCount[type] = (typeCount[type] || 0) + 1;
    });
    return typeCount;
  };

  return { aggregateData };
}