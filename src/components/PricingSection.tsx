import { Button } from './Button';
import { useInViewAnimation } from '../hooks/useInViewAnimation';

type PricingSectionProps = {
  bookUrl: string;
};

const reveal = (isInView: boolean) => (isInView ? 'animate-fade-in-up' : 'opacity-0');

export function PricingSection({ bookUrl }: PricingSectionProps) {
  const { ref, isInView } = useInViewAnimation<HTMLElement>();

  return (
    <section
      className="w-full px-6 py-12"
      id="pricing"
      ref={ref}
    >
      <div className="grid gap-8 md:ml-auto md:max-w-4xl md:grid-cols-2 md:justify-end">
        <article
          className={
            reveal(isInView) +
            ' rounded-[40px] bg-[#051A24] px-10 pb-10 pl-10 pr-10 pt-3 text-[#F6FCFF] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-18px_50px_rgba(255,255,255,0.03)] md:pr-24'
          }
          style={{ animationDelay: '0.1s' }}
        >
          <div className="space-y-6">
            <h3 className="text-[22px] font-medium">Growth Engine</h3>
            <p className="text-sm leading-relaxed text-[#E0EBF0] md:text-base">
              Organic strategy, paid strategy, calendar, video production, and monthly
              optimization.
              <br />
              Built for real estate professionals who want a complete content machine.
            </p>
            <div className="space-y-1 pt-2">
              <p className="text-2xl text-[#F6FCFF]">$499</p>
              <p className="text-sm text-[#E0EBF0]">Monthly</p>
            </div>
            <div className="flex flex-col gap-3 pt-3 sm:flex-row">
              <Button href={bookUrl}>Build my strategy</Button>
              <Button
                className="justify-center"
                href={bookUrl}
                variant="secondary"
              >
                How it works
              </Button>
            </div>
          </div>
        </article>

        <article
          className={
            reveal(isInView) +
            ' rounded-[40px] bg-white px-10 pb-10 pl-10 pr-10 pt-3 text-[#0D212C] shadow-[0_4px_16px_rgba(0,0,0,0.08)] md:pr-24'
          }
          style={{ animationDelay: '0.2s' }}
        >
          <div className="space-y-6">
            <h3 className="text-[22px] font-medium">Custom Agency Setup</h3>
            <p className="text-sm leading-relaxed text-[#273C46] md:text-base">
              For teams that need custom workflows, brand templates, integrations, and advanced
              paid creative testing.
              <br />
              Same AI growth loop, adapted to your market.
            </p>
            <div className="space-y-1 pt-2">
              <p className="text-2xl text-[#0D212C]">$1,500</p>
              <p className="text-sm text-[#273C46]">Setup</p>
            </div>
            <div className="pt-3">
              <Button
                href={bookUrl}
                variant="tertiary"
              >
                Build my strategy
              </Button>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
