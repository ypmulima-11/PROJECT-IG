import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "default" | "outline" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  default: "button button-dark",
  outline: "button button-outline",
  ghost: "button button-ghost",
};

export function Button({ variant = "default", className = "", ...props }: ButtonProps) {
  return <button {...props} className={`${variantClasses[variant]} ${className}`.trim()} />;
}
