// A small rounded label beside a name, such as Beta or Soon. It takes the color of the text it's in, so it reads on a
// pressed toggle too. See docs/UI.md.
export function Badge({ label }: { label: string }): React.JSX.Element {
  return (
    <span className="rounded-full border border-current px-2 py-0.5 text-xs font-normal whitespace-nowrap opacity-70">
      {label}
    </span>
  )
}
