import { useApp } from '../../context';
import { groupRows, propertiesFor, queryRows, rowsFor } from '../../database-engine';
import type { DatabaseKind } from '../../database-schema';

export function useDatabaseModel(kind: DatabaseKind, query: string) {
  const { w, update, busy, notify } = useApp();
  const db = w.databases[kind];
  const view = db.views.find((v) => v.id === db.activeViewId) ?? db.views[0];
  const properties = propertiesFor(w, kind);
  const rows = queryRows(rowsFor(w, kind), view, properties, query);
  const ordered = [
    ...view.order.filter((id) => properties.some((p) => p.id === id)),
    ...properties.map((p) => p.id).filter((id) => !view.order.includes(id)),
  ];
  const columns = ordered
    .filter(
      (id) => !view.hidden.includes(id) || properties.find((p) => p.id === id)?.type === 'title',
    )
    .map((id) => properties.find((p) => p.id === id)!);
  const groupProperty = properties.find((p) => p.id === view.groupBy);
  const groups = groupRows(rows, groupProperty);
  return {
    kind,
    w,
    db,
    view,
    properties,
    rows,
    ordered,
    columns,
    groupProperty,
    groups,
    titleProperty: properties[0],
    busy,
    update,
    notify,
  };
}
export type DatabaseModel = ReturnType<typeof useDatabaseModel>;
