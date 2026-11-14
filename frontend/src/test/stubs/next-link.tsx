import type { AnchorHTMLAttributes, ReactNode } from "react";

type LinkHref =
  | string
  | {
      pathname?: string;
      query?: Record<string, string | number | boolean | undefined>;
    };

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: LinkHref;
  children?: ReactNode;
};

/** Minimal `next/link` replacement for Vitest, which has no Next runtime. */
export default function Link({ href, children, ...rest }: LinkProps) {
  const target =
    typeof href === "string"
      ? href
      : [
          href.pathname ?? "",
          href.query
            ? new URLSearchParams(
                Object.entries(href.query)
                  .filter(([, value]) => value !== undefined)
                  .map(([key, value]) => [key, String(value)]),
              ).toString()
            : "",
        ]
          .filter(Boolean)
          .join("?");

  return (
    <a href={target} {...rest}>
      {children}
    </a>
  );
}
