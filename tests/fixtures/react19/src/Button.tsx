import React, { forwardRef } from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`btn btn-${variant}`}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

