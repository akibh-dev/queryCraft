import { type ComponentPropsWithoutRef, type ReactNode, useId } from "react";
import styles from "./primitives.module.css";

type Variant = "primary" | "secondary";

export function actionClassName(variant: Variant = "primary") {
  return variant === "primary"
    ? `${styles.action} ${styles.primary}`
    : styles.action;
}

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: Variant;
  disabledReason?: string;
};

export function Button({
  variant,
  disabledReason,
  disabled,
  className,
  type = "button",
  "aria-describedby": description,
  ...props
}: ButtonProps) {
  const reasonId = useId();
  const button = (
    <button
      {...props}
      type={type}
      className={[actionClassName(variant), className]
        .filter(Boolean)
        .join(" ")}
      disabled={disabled || Boolean(disabledReason)}
      aria-describedby={
        [description, disabledReason && reasonId].filter(Boolean).join(" ") ||
        undefined
      }
    />
  );
  if (!disabledReason) return button;
  return (
    <span className={styles.withReason}>
      {button}
      <span id={reasonId} className={styles.note}>
        {disabledReason}
      </span>
    </span>
  );
}

export function Panel({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      {...props}
      className={[styles.panel, className].filter(Boolean).join(" ")}
    />
  );
}

type FieldGroupProps = {
  legend: string;
  description?: string;
  error?: string;
  disabled?: boolean;
  children: ReactNode;
};

export function FieldGroup({
  legend,
  description,
  error,
  disabled,
  children,
}: FieldGroupProps) {
  const groupId = useId();
  const descriptionId = description ? `${groupId}-description` : undefined;
  const errorId = error ? `${groupId}-error` : undefined;
  return (
    <fieldset
      className={styles.group}
      disabled={disabled}
      aria-describedby={
        [descriptionId, errorId].filter(Boolean).join(" ") || undefined
      }
      aria-invalid={error ? true : undefined}
    >
      <legend>{legend}</legend>
      {description && (
        <p className={styles.note} id={descriptionId}>
          {description}
        </p>
      )}
      <div className={styles.fields}>
        {children}
        {error && (
          <p className={styles.error} id={errorId}>
            {error}
          </p>
        )}
      </div>
    </fieldset>
  );
}

type ChoiceFieldProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "type" | "children"
> & {
  type: "checkbox" | "radio";
  label: string;
};

export function ChoiceField({ label, ...props }: ChoiceFieldProps) {
  return (
    <label className={styles.choice}>
      <input {...props} />
      <span>{label}</span>
    </label>
  );
}
