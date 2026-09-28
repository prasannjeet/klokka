import { Icon, type IconName } from './Icon';

/** The icon + title + line list used by the employer and employee sections. */
export function FeatureList({
  items,
  icons,
}: {
  items: ReadonlyArray<{ title: string; body: string }>;
  icons: readonly IconName[];
}) {
  return (
    <ul className="flist">
      {items.map((item, i) => (
        <li key={item.title}>
          <span className="ic">
            <Icon name={icons[i] ?? 'check'} />
          </span>
          <div>
            <b>{item.title}</b>
            <p>{item.body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
