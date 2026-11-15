import React from 'react';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  onClick,
  disabled = false,
  icon: Icon,
  style = {},
  className = '',
}) => {
  const btnClass = `btn btn-${variant} ${size === 'sm' ? 'btn-sm' : ''} ${className}`;

  return (
    <button
      type={type}
      className={btnClass}
      onClick={onClick}
      disabled={disabled}
      style={style}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 16} />}
      {children}
    </button>
  );
};

export default Button;
