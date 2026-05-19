import type { AnchorHTMLAttributes, ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary';

type SharedProps = {
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
};

type AnchorProps = SharedProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
  };

type NativeButtonProps = SharedProps & ButtonHTMLAttributes<HTMLButtonElement>;

const primaryShadow =
  '0 1px 2px 0 rgba(5, 26, 36, 0.1), 0 4px 4px 0 rgba(5, 26, 36, 0.09), 0 9px 6px 0 rgba(5, 26, 36, 0.05), 0 17px 7px 0 rgba(5, 26, 36, 0.01), 0 26px 7px 0 rgba(5, 26, 36, 0), inset 0 2px 8px 0 rgba(255, 255, 255, 0.5)';

const secondaryShadow = '0 0 0 0.5px rgba(0, 0, 0, 0.05), 0 4px 30px rgba(0, 0, 0, 0.08)';
const tertiaryShadow =
  '0 1px 2px rgba(5, 26, 36, 0.08), 0 12px 30px rgba(5, 26, 36, 0.08), inset 0 2px 8px rgba(255, 255, 255, 0.75)';

const cx = (...parts: Array<string | undefined | false>) => parts.filter(Boolean).join(' ');

const getVariantClasses = (variant: ButtonVariant) => {
  switch (variant) {
    case 'secondary':
      return {
        className: 'bg-white text-[#051A24]',
        style: { boxShadow: secondaryShadow } satisfies CSSProperties,
      };
    case 'tertiary':
      return {
        className: 'bg-white text-[#051A24]',
        style: { boxShadow: tertiaryShadow } satisfies CSSProperties,
      };
    case 'primary':
    default:
      return {
        className: 'bg-[#051A24] text-white',
        style: { boxShadow: primaryShadow } satisfies CSSProperties,
      };
  }
};

const buttonBaseClass =
  'inline-flex items-center justify-center gap-3 rounded-full px-7 py-3 text-sm font-medium transition duration-300 hover:-translate-y-0.5 hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[#051A24]/15';

export function Button(props: AnchorProps | NativeButtonProps) {
  const { variant = 'primary', className, children, ...rest } = props;
  const variantConfig = getVariantClasses(variant);
  const mergedClassName = cx(buttonBaseClass, variantConfig.className, className);

  if ('href' in props) {
    const anchorProps = rest as AnchorHTMLAttributes<HTMLAnchorElement>;

    return (
      <a
        {...anchorProps}
        className={mergedClassName}
        rel={anchorProps.target === '_blank' ? 'noreferrer' : anchorProps.rel}
        style={variantConfig.style}
      >
        {children}
      </a>
    );
  }

  const buttonProps = rest as ButtonHTMLAttributes<HTMLButtonElement>;

  return (
    <button
      {...buttonProps}
      className={mergedClassName}
      style={variantConfig.style}
      type={buttonProps.type ?? 'button'}
    >
      {children}
    </button>
  );
}
