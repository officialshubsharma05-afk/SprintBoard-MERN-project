import React from 'react';

const Card = ({ title, extra, children, className = '', style = {} }) => {
  return (
    <div className={`card ${className}`} style={style}>
      {(title || extra) && (
        <div className="card-header">
          {title && <h3 className="card-title">{title}</h3>}
          {extra && <div>{extra}</div>}
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  );
};

export default Card;
