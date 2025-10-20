import React from 'react'

interface CardProps {
  title: string
  children: React.ReactNode
  onClick?: (event: React.MouseEvent) => void
}

export function Card({ title, children, onClick }: CardProps) {
  return (
    <div 
      className="card" 
      data-testid="card-component"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <h2 className="card-title">{title}</h2>
      <div className="card-content">
        {children}
      </div>
    </div>
  )
}
