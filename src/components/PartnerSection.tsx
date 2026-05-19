import { useEffect, useRef, useState } from 'react';
import { Button } from './Button';
import { useInViewAnimation } from '../hooks/useInViewAnimation';

type PartnerSectionProps = {
  bookUrl: string;
  images: string[];
};

type TrailSprite = {
  createdAt: number;
  id: number;
  rotation: number;
  size: number;
  src: string;
  x: number;
  y: number;
};

const reveal = (isInView: boolean) => (isInView ? 'animate-fade-in-up' : 'opacity-0');

export function PartnerSection({ bookUrl, images }: PartnerSectionProps) {
  const { ref, isInView } = useInViewAnimation<HTMLElement>();
  const [sprites, setSprites] = useState<TrailSprite[]>([]);
  const frameRef = useRef<number | null>(null);
  const lastSpawnRef = useRef(0);
  const counterRef = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loop = () => {
      const now = performance.now();
      setSprites((current) => {
        const next = current.filter((sprite) => now - sprite.createdAt < 1000);
        return next.length === current.length ? current : next;
      });
      frameRef.current = window.requestAnimationFrame(loop);
    };

    frameRef.current = window.requestAnimationFrame(loop);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const spawnSprite = (clientX: number, clientY: number) => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const now = performance.now();

    if (now - lastSpawnRef.current < 80) {
      return;
    }

    lastSpawnRef.current = now;
    const rect = container.getBoundingClientRect();
    const nextSprite: TrailSprite = {
      createdAt: now,
      id: counterRef.current++,
      rotation: Math.random() * 20 - 10,
      size: 88 + Math.random() * 30,
      src: images[Math.floor(Math.random() * images.length)],
      x: clientX - rect.left,
      y: clientY - rect.top,
    };

    setSprites((current) => [...current.slice(-18), nextSprite]);
  };

  return (
    <section
      className="w-full px-6 py-12"
      ref={ref}
    >
      <div
        className="relative mx-auto max-w-7xl overflow-hidden rounded-[40px] bg-white py-48 shadow-[0_12px_60px_rgba(5,26,36,0.08)]"
        onMouseMove={(event) => spawnSprite(event.clientX, event.clientY)}
        ref={containerRef}
      >
        {sprites.map((sprite) => (
          <img
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute rounded-2xl object-cover shadow-lg animate-trail-fade"
            key={sprite.id}
            src={sprite.src}
            style={{
              height: sprite.size * 1.35,
              left: sprite.x,
              top: sprite.y,
              transform: `translate(-50%, -50%) rotate(${sprite.rotation}deg)`,
              width: sprite.size,
            }}
          />
        ))}

        <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-6 text-center">
          <h2
            className={
              reveal(isInView) +
              ' mb-12 font-serifAccent text-[48px] leading-none tracking-tight text-[#0D212C] md:text-[64px] lg:text-[80px]'
            }
            style={{ animationDelay: '0.1s' }}
          >
            Build your content engine
          </h2>

          <div
            className={reveal(isInView)}
            style={{ animationDelay: '0.2s' }}
          >
            <Button
              className="px-5 py-2.5"
              href={bookUrl}
            >
              <img
                alt="EstateFlow AI advisor"
                className="h-10 w-10 rounded-full object-cover"
                src="https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=200"
              />
              <span>Start with EstateFlow AI</span>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
