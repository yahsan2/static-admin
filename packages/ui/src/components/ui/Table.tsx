import React from 'react';
import { cn } from '../../lib/utils';

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  zebra?: boolean;
  pinRows?: boolean;
  pinCols?: boolean;
}

export function Table({ className, zebra, pinRows, pinCols, children, ...props }: TableProps) {
  return (
    <table
      className={cn(
        'table',
        zebra && 'table-zebra',
        pinRows && 'table-pin-rows',
        pinCols && 'table-pin-cols',
        className
      )}
      {...props}
    >
      {children}
    </table>
  );
}

export interface TableHeadProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

export function TableHead({ className, children, ...props }: TableHeadProps) {
  return (
    <thead className={cn(className)} {...props}>
      {children}
    </thead>
  );
}

export interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

export function TableBody({ className, children, ...props }: TableBodyProps) {
  return (
    <tbody className={cn(className)} {...props}>
      {children}
    </tbody>
  );
}

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  hover?: boolean;
}

export function TableRow({ className, hover, children, ...props }: TableRowProps) {
  return (
    <tr className={cn(hover && 'hover', className)} {...props}>
      {children}
    </tr>
  );
}

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {}

export function TableCell({ className, children, ...props }: TableCellProps) {
  return (
    <td className={cn(className)} {...props}>
      {children}
    </td>
  );
}

export interface TableHeaderCellProps extends React.ThHTMLAttributes<HTMLTableCellElement> {}

export function TableHeaderCell({ className, children, ...props }: TableHeaderCellProps) {
  return (
    <th className={cn(className)} {...props}>
      {children}
    </th>
  );
}
