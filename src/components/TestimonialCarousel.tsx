import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useInViewAnimation } from '../hooks/useInViewAnimation';

type Testimonial = {
  name: string;
  role: string;
  company: string;
  quote: string;
  avatar: string;
};

type TestimonialCarouselProps = {
  testimonials: Testimonial[];
};

const reveal = (isInView: boolean) => (isInView ? 'animate-fade-in-up' : 'opacity-0');

export function TestimonialCarousel({ testimonials }: TestimonialCarouselProps) {
  const { ref, isInView } = useInViewAnimation<HTMLElement>();
  const tripledTestimonials = useMemo(
    () => [...testimonials, ...testimonials, ...testimonials],
    [testimonials],
  );
  const [currentIndex, setCurrentIndex] = useState(testimonials.length);
  const [isPaused, setIsPaused] = useState(false);
  const [hasTransition, setHasTransition] = useState(true);
  const [slideDistance, setSlideDistance] = useState(451.5);
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const measure = () => {
      const track = trackRef.current;
      const firstCard = track?.querySelector<HTMLElement>('[data-card="true"]');

      if (!track || !firstCard) {
        return;
      }

      const styles = window.getComputedStyle(track);
      const gapValue = Number.parseFloat(styles.columnGap || styles.gap || '24');
      setSlideDistance(firstCard.offsetWidth + gapValue);
    };

    measure();
    window.addEventListener('resize', measure);

    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    if (isPaused) {
      return;
    }

    const interval = window.setInterval(() => {
      setCurrentIndex((prev) => prev + 1);
    }, 3000);

    return () => window.clearInterval(interval);
  }, [isPaused]);

  const normalizeIndex = () => {
    if (currentIndex >= testimonials.length * 2) {
      setHasTransition(false);
      setCurrentIndex((prev) => prev - testimonials.length);

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setHasTransition(true));
      });
    }

    if (currentIndex < testimonials.length) {
      setHasTransition(false);
      setCurrentIndex((prev) => prev + testimonials.length);

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setHasTransition(true));
      });
    }
  };

  return (
    <section
      className="w-full py-20"
      id="demo"
      ref={ref}
    >
      <div className="space-y-10">
        <div className="px-6 md:ml-auto md:max-w-4xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <h2
              className={
                reveal(isInView) +
                ' text-[32px] leading-[1.1] tracking-tight text-[#0D212C] md:text-[40px] lg:text-[44px]'
              }
              style={{ animationDelay: '0.1s' }}
            >
              What <span className="font-serifAccent">agents</span> say
            </h2>

            <div
              className={reveal(isInView) + ' flex items-center gap-3'}
              style={{ animationDelay: '0.2s' }}
            >
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    className="h-5 w-5 fill-black text-black"
                    key={index}
                  />
                ))}
              </div>
              <span className="text-sm text-[#051A24]">Early users 5/5</span>
            </div>
          </div>
        </div>

        <div
          className={reveal(isInView) + ' space-y-6'}
          style={{ animationDelay: '0.3s' }}
        >
          <div className="flex items-center justify-end gap-3 px-6">
            <button
              aria-label="Previous testimonial"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-[#0D212C]/20 text-[#0D212C] transition duration-300 hover:bg-[#0D212C] hover:text-white"
              onClick={() => setCurrentIndex((prev) => prev - 1)}
              type="button"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              aria-label="Next testimonial"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-[#0D212C]/20 text-[#0D212C] transition duration-300 hover:bg-[#0D212C] hover:text-white"
              onClick={() => setCurrentIndex((prev) => prev + 1)}
              type="button"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div
            className="overflow-hidden"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div
              className="flex gap-6 px-6"
              onTransitionEnd={normalizeIndex}
              ref={trackRef}
              style={{
                transform: `translateX(-${currentIndex * slideDistance}px)`,
                transition: hasTransition
                  ? 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                  : 'none',
              }}
            >
              {tripledTestimonials.map((testimonial, index) => {
                const distance = Math.abs(index - currentIndex);

                return (
                  <article
                    className="w-[calc(100vw-48px)] shrink-0 rounded-[32px] bg-white px-6 py-8 shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all duration-700 ease-out md:w-[427.5px] md:rounded-[40px] md:pl-10 md:pr-24"
                    data-card="true"
                    key={`${testimonial.name}-${index}`}
                    style={{
                      opacity: distance <= 2 ? 1 : 0.55,
                      transform: `scale(${distance === 0 ? 1 : distance === 1 ? 0.985 : 0.96})`,
                    }}
                  >
                    <div className="space-y-6">
                      <svg
                        className="h-10 w-10 text-[#0D212C]"
                        fill="none"
                        viewBox="0 0 48 48"
                      >
                        <path
                          d="M13.138 28.708C9.846 28.708 7 26.108 7 22.58C7 17.878 10.876 14.31 18.4 12.4L19.928 15.74C15.154 17.068 13.138 19.12 13.138 21.53C13.138 22.388 13.534 23.06 14.282 23.656C14.786 24.062 15.1 24.64 15.1 25.27V26.706C15.1 27.81 14.226 28.708 13.138 28.708ZM31.138 28.708C27.846 28.708 25 26.108 25 22.58C25 17.878 28.876 14.31 36.4 12.4L37.928 15.74C33.154 17.068 31.138 19.12 31.138 21.53C31.138 22.388 31.534 23.06 32.282 23.656C32.786 24.062 33.1 24.64 33.1 25.27V26.706C33.1 27.81 32.226 28.708 31.138 28.708Z"
                          fill="currentColor"
                        />
                      </svg>

                      <p className="text-base leading-relaxed text-[#0D212C]">{testimonial.quote}</p>

                      <div className="flex items-center gap-4">
                        <img
                          alt={testimonial.name}
                          className="h-12 w-12 rounded-full object-cover"
                          src={testimonial.avatar}
                        />
                        <div>
                          <p className="text-sm font-semibold text-[#0D212C]">{testimonial.name}</p>
                          <p className="text-sm text-[#273C46]">
                            → {testimonial.role}, {testimonial.company}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
