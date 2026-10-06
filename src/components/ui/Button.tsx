import React from 'react'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center rounded-xl font-medium transition duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-cafe-espresso disabled:opacity-50 disabled:pointer-events-none'
  const variants: Record<string, string> = {
    primary: 'btn-accent text-white hover:brightness-110 focus:ring-cafe-sage',
    secondary: 'bg-cafe-surface-hi/60 text-cafe-cream border border-cafe-border hover:border-cafe-sage/60 focus:ring-cafe-sage',
    danger: 'bg-cafe-danger text-white hover:brightness-110 focus:ring-cafe-danger',
  }
  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}