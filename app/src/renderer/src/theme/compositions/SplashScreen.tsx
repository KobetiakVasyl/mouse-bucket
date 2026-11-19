// The splash screen the app opens with: its logo and name, large, centered on the whole window. See docs/UI.md.
import logo from '../../../../../resources/icon.png'

export function SplashScreen(): React.JSX.Element {
  return (
    <div
      aria-busy="true"
      className="fixed inset-0 flex flex-col items-center justify-center gap-8 bg-paper p-8"
    >
      <img
        src={logo}
        alt=""
        className="size-[min(50vh,50vw)] rounded-[12%] motion-safe:animate-splash-in"
      />
      <p className="text-5xl font-semibold motion-safe:animate-splash-in">MouseBucket</p>
    </div>
  )
}
