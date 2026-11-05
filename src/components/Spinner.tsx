
type SpinnerProps = {
  label?: string;
  size?: "small" | "medium" | "large";
};

export function Spinner({
  label = "Cargando...",
  size = "medium"
}: SpinnerProps) {
  return (
    <div
      className="spinner-container"
      role="status"
      aria-live="polite"
    >
      <span
        className={`spinner spinner--${size}`}
        aria-hidden="true"
      />
      <span className="spinner-label">{label}</span>
    </div>
  );
}
