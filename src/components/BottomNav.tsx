import { Button } from './Button';

type BottomNavProps = {
  bookUrl: string;
};

export function BottomNav({ bookUrl }: BottomNavProps) {
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 px-4">
      <div
        className="pointer-events-auto flex items-center gap-4 rounded-full bg-white px-5 py-2 shadow-[0_1px_2px_rgba(5,26,36,0.08),0_10px_30px_rgba(5,26,36,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]"
      >
        <span className="font-serifAccent text-2xl font-semibold text-[#051A24]">E</span>
        <Button
          className="px-5 py-2.5 text-sm"
          href={bookUrl}
        >
          Build my strategy
        </Button>
      </div>
    </div>
  );
}
