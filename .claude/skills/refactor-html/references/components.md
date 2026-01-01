# Available UI Components

Location: `packages/ui/src/components/ui/`

## Alert

```tsx
import { Alert } from '../ui/Alert';

<Alert variant="error">{message}</Alert>
```

Props: `variant?: 'info' | 'success' | 'warning' | 'error'`

## Button

```tsx
import { Button } from '../ui/Button';

<Button variant="primary" size="sm" loading={isSaving}>Save</Button>
<Button variant="ghost" size="sm" shape="square"><Icon /></Button>
```

Props:
- `variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'outline' | 'link'`
- `size?: 'xs' | 'sm' | 'md' | 'lg'`
- `shape?: 'square' | 'circle'`
- `loading?: boolean` - shows spinner automatically when true

## Input

```tsx
import { Input } from '../ui/Input';

<Input type="email" value={value} onChange={handler} error={hasError} />
```

Props: `error?: boolean` - applies error styling

## Select

```tsx
import { Select } from '../ui/Select';

<Select value={value} onChange={handler} error={hasError}>
  <option value="a">Option A</option>
</Select>
```

Props: `error?: boolean`

## Textarea

```tsx
import { Textarea } from '../ui/Textarea';

<Textarea value={value} onChange={handler} error={hasError} />
```

Props: `error?: boolean`

## Checkbox

```tsx
import { Checkbox } from '../ui/Checkbox';

<Checkbox checked={value} onChange={handler} />
```

Props: `variant?, size?, error?`

## Fieldset & FieldsetLegend

```tsx
import { Fieldset, FieldsetLegend } from '../ui/Fieldset';

<Fieldset>
  <FieldsetLegend>Label <span className="text-error">*</span></FieldsetLegend>
  <Input />
</Fieldset>
```

## Loading

```tsx
import { Loading } from '../ui/Loading';

<Loading size="md" />
<Loading variant="dots" size="xs" />
```

Props:
- `variant?: 'spinner' | 'dots' | 'ring' | 'ball' | 'bars' | 'infinity'`
- `size?: 'xs' | 'sm' | 'md' | 'lg'`

## Badge

```tsx
import { Badge } from '../ui/Badge';

<Badge variant="primary">Label</Badge>
```

## Card, CardBody, CardTitle, CardActions

```tsx
import { Card, CardBody, CardTitle } from '../ui/Card';

<Card>
  <CardBody>
    <CardTitle>Title</CardTitle>
    Content
  </CardBody>
</Card>
```

## Table

```tsx
import { Table } from '../ui/Table';

<Table zebra>{/* thead, tbody */}</Table>
```

## Breadcrumbs

```tsx
import { Breadcrumbs } from '../ui/Breadcrumbs';

<Breadcrumbs>
  <li><Link to="/">Home</Link></li>
  <li>Current</li>
</Breadcrumbs>
```

## Menu, MenuItem, MenuTitle, MenuLink

```tsx
import { Menu, MenuItem, MenuLink } from '../ui/Menu';

<Menu>
  <MenuItem><MenuLink to="/path">Item</MenuLink></MenuItem>
</Menu>
```
