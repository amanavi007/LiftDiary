import { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
  size?: "md" | "lg";
};

export function buttonClass(variant: "primary" | "ghost" = "primary", size: "md" | "lg" = "md") {
  const base =
    "inline-flex w-full items-center justify-center rounded-2xl font-bold transition active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100";
  const sizes = size === "lg" ? "min-h-14 px-5 text-base" : "min-h-12 px-4 text-sm";
  const looks =
    variant === "primary"
      ? "bg-accent text-bg"
      : "border border-line bg-surface text-ink";
  return `${base} ${sizes} ${looks}`;
}

export function Button({ variant = "primary", size = "md", className = "", type = "button", ...rest }: Props) {
  return <button type={type} className={`${buttonClass(variant, size)} ${className}`} {...rest} />;
}
