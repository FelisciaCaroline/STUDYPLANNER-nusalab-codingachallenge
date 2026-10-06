import React from 'react'

type CardProps = React.HTMLAttributes<HTMLDivElement>

export default function Card({ className = '', children, ...props }: CardProps) {
  return (
    <div className={`glass rounded-2xl p-6 ${className}`} {...props}>
      {children}
    </div>
  )
}