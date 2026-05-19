import { ArrowUpRight } from 'lucide-react';
import { Button } from './Button';
import { useInViewAnimation } from '../hooks/useInViewAnimation';

type FooterProps = {
  bookUrl: string;
};

const reveal = (isInView: boolean) => (isInView ? 'animate-fade-in-up' : 'opacity-0');

export function Footer({ bookUrl }: FooterProps) {
  const { ref, isInView } = useInViewAnimation<HTMLElement>();

  return (
    <footer
      className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-6 py-12 md:flex-row md:items-start md:justify-between"
      ref={ref}
    >
      <div
        className={reveal(isInView)}
        style={{ animationDelay: '0.1s' }}
      >
        <Button href={bookUrl}>Build my strategy</Button>
      </div>

      <div
        className={reveal(isInView) + ' flex flex-col gap-6 md:flex-row md:items-start md:gap-12'}
        style={{ animationDelay: '0.2s' }}
      >
        <ArrowUpRight className="h-6 w-6 text-[#051A24]" />

        <div className="grid gap-8 sm:grid-cols-2">
          <div className="space-y-3">
            <a
              className="block text-base text-[#051A24] transition hover:opacity-70"
              href="#workflow"
            >
              Workflow
            </a>
            <a
              className="block text-base text-[#051A24] transition hover:opacity-70"
              href="#pricing"
            >
              Product
            </a>
            <a
              className="block text-base text-[#051A24] transition hover:opacity-70"
              href="#demo"
            >
              Demo
            </a>
          </div>

          <div className="space-y-3">
            <a
              className="block text-base text-[#051A24] transition hover:opacity-70"
              href="https://x.com"
              rel="noreferrer"
              target="_blank"
            >
              x.com
            </a>
            <a
              className="block text-base text-[#051A24] transition hover:opacity-70"
              href="https://linkedin.com"
              rel="noreferrer"
              target="_blank"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
