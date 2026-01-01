import React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div className={cn('card bg-base-100', className)} {...props}>
      {children}
    </div>
  );
}

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardBody({ className, children, ...props }: CardBodyProps) {
  return (
    <div className={cn('card-body', className)} {...props}>
      {children}
    </div>
  );
}

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export function CardTitle({ className, children, ...props }: CardTitleProps) {
  return (
    <h2 className={cn('card-title', className)} {...props}>
      {children}
    </h2>
  );
}

export interface CardActionsProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardActions({ className, children, ...props }: CardActionsProps) {
  return (
    <div className={cn('card-actions', className)} {...props}>
      {children}
    </div>
  );
}
