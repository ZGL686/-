import { FileText } from 'lucide-react';
import { Button } from '../../components/ui';
import type { DatabaseRow } from '../../database-engine';
import { displayValue } from '../../database-engine';

import { CellDisplay } from './Cells';
import type { DatabaseModel } from './useDatabaseModel';
export function DatabaseCard({
  model,
  row,
  onOpen: open,
  sourceGroup = '',
}: {
  model: DatabaseModel;
  row: DatabaseRow;
  onOpen: (row: DatabaseRow) => void;
  sourceGroup?: string;
}) {
  const { view, groupProperty, columns, titleProperty } = model;
  return (
    <article
      key={row.id}
      className="database-card"
      draggable={view.layout === 'board' && !!groupProperty && !groupProperty.readonly}
      onDragEnd={(e) => e.currentTarget.classList.remove('dragging')}
      onDragStart={(e) => {
        e.currentTarget.classList.add('dragging');
        e.dataTransfer.setData(
          'application/guilu-row',
          JSON.stringify({ id: row.id, group: sourceGroup }),
        );
      }}
    >
      <Button className="database-card-title" onClick={() => open(row)}>
        <FileText size={16} />
        <strong>{displayValue(row.values[titleProperty.id])}</strong>
      </Button>
      <div className="card-properties">
        {columns
          .filter((p) => p.type !== 'title' && p.id !== view.groupBy)
          .map((p) => (
            <div key={p.id} title={p.name}>
              <span className="card-property-name">{p.name}</span>
              <CellDisplay value={row.values[p.id]} property={p} />
            </div>
          ))}
      </div>
    </article>
  );
}
