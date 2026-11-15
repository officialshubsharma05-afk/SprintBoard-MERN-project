import React from 'react';

const Badge = ({ type = 'status', value = 'todo', children }) => {
  const normalizedValue = String(value).toLowerCase().replace(/\s+/g, '_');
  const className = type === 'priority' 
    ? `badge badge-priority-${normalizedValue}`
    : `badge badge-${normalizedValue}`;

  const formatText = (text) => {
    return text.replace(/_/g, ' ');
  };

  return (
    <span className={className}>
      {children || formatText(value)}
    </span>
  );
};

export default Badge;
