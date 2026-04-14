import React from 'react';

interface StarBorderProps {
  as?: React.ElementType;
  className?: string;
  color?: string;
  speed?: string;
  thickness?: number;
  children?: React.ReactNode;
  [key: string]: any;
}

const StarBorder = ({
  as: Component = 'button',
  className = '',
  color = '#38bdf8', // Default to a cyan/blue
  speed = '6s',
  thickness = 1,
  children,
  ...rest
}: StarBorderProps) => {
  return (
    <Component
      className={`relative inline-block overflow-hidden rounded-[20px] ${className}`}
      style={{
        padding: `${thickness}px 0`,
        ...rest.style
      }}
      {...rest}
    >
      <div
        className="absolute w-[300%] h-[50%] opacity-70 bottom-[-11px] right-[-250%] rounded-full animate-star-movement-bottom z-0"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animationDuration: speed
        }}
      ></div>
      <div
        className="absolute w-[300%] h-[50%] opacity-70 top-[-10px] left-[-250%] rounded-full animate-star-movement-top z-0"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animationDuration: speed
        }}
      ></div>
      <div className="relative z-10 bg-gradient-to-b from-[#0c1324] to-[#1e2536] border border-white/10 text-white text-center text-[15px] py-[12px] px-[24px] rounded-[19px] whitespace-nowrap">
        {children}
      </div>
    </Component>
  );
};

export default StarBorder;
