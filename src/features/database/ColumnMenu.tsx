import type { RefObject } from 'react';
import { useState } from 'react';
import { Button, Popover } from '../../components/ui';
import type { Property } from '../../database-engine';
import type { DatabaseView } from '../../database-schema';
export function ColumnMenu({
  property,
  view,
  anchor,
  onSave,
  onEdit,
  onClose,
}: {
  property: Property;
  view: DatabaseView;
  anchor: RefObject<HTMLButtonElement | null>;
  onSave: (v: DatabaseView) => Promise<boolean>;
  onEdit: () => void;
  onClose: () => void;
}) {
  const [width, setWidth] = useState(view.widths[property.id] ?? 160);
  return (
    <Popover
      anchor={anchor}
      label={`${property.name}列设置`}
      className="column-menu"
      onClose={onClose}
    >
      <strong>{property.name}</strong>
      {(['asc', 'desc'] as const).map((direction) => (
        <Button
          key={direction}
          onClick={async () => {
            if (
              await onSave({
                ...view,
                sorts: [
                  { property: property.id, direction },
                  ...view.sorts.filter((s) => s.property !== property.id),
                ],
              })
            )
              onClose();
          }}
        >
          {direction === 'asc' ? '升序排列' : '降序排列'}
        </Button>
      ))}
      {property.type !== 'title' && (
        <Button
          onClick={async () => {
            if (await onSave({ ...view, hidden: [...view.hidden, property.id] })) onClose();
          }}
        >
          隐藏此属性
        </Button>
      )}
      {property.id.startsWith('custom:') && <Button onClick={onEdit}>编辑属性</Button>}
      <label>
        列宽 · {width} px
        <input
          aria-label={`${property.name}列宽`}
          type="range"
          min="80"
          max="600"
          value={width}
          onChange={(e) => setWidth(Number(e.target.value))}
          onPointerUp={() =>
            void onSave({ ...view, widths: { ...view.widths, [property.id]: width } })
          }
          onKeyUp={() => void onSave({ ...view, widths: { ...view.widths, [property.id]: width } })}
        />
      </label>
      <Button onClick={onClose}>关闭</Button>
    </Popover>
  );
}
