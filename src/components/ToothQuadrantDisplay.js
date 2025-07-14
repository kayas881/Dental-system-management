// ToothQuadrantDisplay.js
import React from 'react';

export const groupTeethByQuadrants = (toothNumbers) => {
  // helper: dig through any nesting and collect integers
  const nums = [];
  const collect = (x) => {
    if (x == null) return;
    if (Array.isArray(x))             return x.forEach(collect);
    if (typeof x === 'object')        return Object.values(x).forEach(collect);
    if (typeof x === 'string') {
      // try JSON first
      try { return collect(JSON.parse(x)); } catch {
        return x                      // split on , ; space - anything non‑digit
          .split(/[^0-9]+/)
          .forEach(collect);
      }
    }
    const n = parseInt(x, 10);
    if (!isNaN(n) && n >= 11 && n <= 48) nums.push(n);
  };
  collect(toothNumbers);

  const q = { Q1: [], Q2: [], Q3: [], Q4: [] };
  nums.forEach(n => {
    if (n <= 18)           q.Q1.push(n);
    else if (n <= 28)      q.Q2.push(n);
    else if (n <= 38)      q.Q3.push(n);
    else                   q.Q4.push(n);
  });
  Object.values(q).forEach(arr => arr.sort((a,b) => a-b));
  return q;
};

const ToothQuadrantDisplay = ({ toothNumbers }) => {
    const quadrants = groupTeethByQuadrants(toothNumbers);

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            width: '50px',
            height: '35px',
            border: '1px solid #ccc',
            fontSize: '7px',
            fontFamily: 'monospace'
        }}>
            {['Q2', 'Q1', 'Q3', 'Q4'].map((q, idx) => (
                <div key={q} style={{
                    border: '1px solid #ddd',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: quadrants[q].length ? '#e8f4f8' : '#f9f9f9',
                    padding: '2px'
                }}>
                    {quadrants[q].map(t => t.toString().slice(-1)).join('')}
                </div>
            ))}
        </div>
    );
};

export default ToothQuadrantDisplay;
