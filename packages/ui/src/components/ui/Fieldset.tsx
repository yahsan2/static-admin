import React from 'react';
import { cn } from '../../lib/utils';

export interface FieldsetProps extends React.FieldsetHTMLAttributes<HTMLFieldSetElement> {}

export function Fieldset({ className, children, ...props }: FieldsetProps) {
  return (
    <fieldset className={cn('fieldset', className)} {...props}>
      {children}
    </fieldset>
  );
}

export interface FieldsetLegendProps extends React.HTMLAttributes<HTMLLegendElement> {}

export function FieldsetLegend({ className, children, ...props }: FieldsetLegendProps) {
  return (
    <legend className={cn('fieldset-legend', className)} {...props}>
      {children}
    </legend>
  );
}
