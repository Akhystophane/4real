import { Quote } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useInViewAnimation } from '../hooks/useInViewAnimation';

const reveal = (isInView: boolean) => (isInView ? 'animate-fade-in-up' : 'opacity-0');

export function TestimonialSection() {
  const { ref, isInView } = useInViewAnimation<HTMLElement>();
  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const node = imageContainerRef.current;

    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setIsActive(entry.isIntersecting),
      {
        threshold: 0.1,
      },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const updateOffset = () => {
      const node = imageContainerRef.current;

      if (!node) {
        return;
      }

      const rect = node.getBoundingClientRect();
      const viewportCenter = window.innerHeight / 2;
      const elementCenter = rect.top + rect.height / 2;
      const nextOffset = Math.max(-200, Math.min(200, (viewportCenter - elementCenter) * 0.18));
      setOffset(nextOffset);
      frameRef.current = null;
    };

    const requestUpdate = () => {
      if (frameRef.current !== null) {
        return;
      }

      frameRef.current = window.requestAnimationFrame(updateOffset);
    };

    requestUpdate();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);

    return () => {
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [isActive]);

  return (
    <section
      ref={ref}
      className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12"
      id="workflow"
    >
      <Quote
        className={reveal(isInView) + ' h-6 w-6 text-slate-900'}
        style={{ animationDelay: '0.1s' }}
      />

      <p
        className={
          reveal(isInView) +
          ' text-[32px] leading-[1.1] tracking-tight text-[#0D212C] md:text-[40px] lg:text-[44px]'
        }
        style={{ animationDelay: '0.2s' }}
      >
        Real estate agents do not need more random posts. They need a{' '}
        <span className="font-serifAccent">growth system</span> that knows what to create, what to
        test, and what to improve
      </p>

      <p
        className={reveal(isInView) + ' text-sm italic text-[#273C46]'}
        style={{ animationDelay: '0.3s' }}
      >
        EstateFlow AI
      </p>

      <div
        className={reveal(isInView) + ' flex flex-wrap items-center gap-8 pt-3'}
        style={{ animationDelay: '0.4s' }}
      >
        <span className="w-[80px] text-2xl font-medium text-slate-900">Strategy</span>
        <span className="w-[83px] text-2xl font-medium text-slate-900">Video</span>
        <span className="w-[110px] text-2xl font-medium text-slate-900">Analytics</span>
      </div>

      <div
        className={reveal(isInView) + ' flex justify-center pt-3'}
        style={{ animationDelay: '0.5s' }}
      >
        <div
          className="w-full max-w-xs overflow-hidden rounded-2xl shadow-lg"
          ref={imageContainerRef}
        >
          <img
            alt="AI real estate growth workflow"
            className="h-full w-full object-cover transition-transform duration-500 ease-out"
            src="https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260330_103804_7aa5494f-4d5b-432e-9dc7-20715275f143.png&w=1280&q=85"
            style={{ transform: `translateY(${offset}px)` }}
          />
        </div>
      </div>
    </section>
  );
}
