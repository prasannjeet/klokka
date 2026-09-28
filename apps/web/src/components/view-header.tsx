import type { ReactNode } from 'react';

export function ViewHeader({
  title,
  sub,
  actions,
  id,
}: {
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  id?: string;
}) {
  return (
    <div className="vh">
      <div>
        <h1 id={id}>{title}</h1>
        {sub ? <p className="sub">{sub}</p> : null}
      </div>
      {actions ? <div className="actions">{actions}</div> : null}
    </div>
  );
}

export function Illustrative({ children }: { children: ReactNode }) {
  return <p className="illustrative">{children}</p>;
}
