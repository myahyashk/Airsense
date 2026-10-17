import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = "",
  hoverEffect = true,
  ...props
}) => {
  return (
    <div
      className={`bg-airsense-card border border-airsense-border rounded-card p-5 shadow-soft transition-all duration-200 ${
        hoverEffect
          ? "hover:border-[#2a558c] hover:-translate-y-0.5 hover:shadow-glow"
          : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
