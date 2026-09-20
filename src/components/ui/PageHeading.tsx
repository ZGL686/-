import type { ReactNode } from 'react';
import type { PageId } from '../../app/navigation';
import { pages } from '../../app/navigation';
export function PageHeading({
  page,
  description,
  actions,
}: {
  page: PageId;
  description: string;
  actions?: ReactNode;
}) {
  const { title, icon: Icon } = pages[page];
  return (
    <div className="page-heading">
      <div>
        <h1>
          <Icon className="page-title-icon" size={30} strokeWidth={1.65} />
          {title}
        </h1>
        <p>{description}</p>
      </div>
      {actions && <div className="heading-actions">{actions}</div>}
    </div>
  );
}
