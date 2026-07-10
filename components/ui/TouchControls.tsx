"use client";

export type TouchControlsVariant = "joystick" | "dpad" | "dpad-horizontal";

export interface TouchControlsProps {
  variant: TouchControlsVariant;
}

const CODE_TO_KEY: Record<string, string> = {
  ArrowLeft: "ArrowLeft",
  ArrowRight: "ArrowRight",
  ArrowUp: "ArrowUp",
  ArrowDown: "ArrowDown",
  Space: " ",
};

function dispatchKey(type: "keydown" | "keyup", code: string) {
  document.dispatchEvent(
    new KeyboardEvent(type, { code, key: CODE_TO_KEY[code] ?? code, bubbles: true }),
  );
}

function TouchButton({
  code,
  label,
  className = "",
}: {
  code: string;
  label: string;
  className?: string;
}) {
  const press = (e: React.PointerEvent) => {
    e.preventDefault();
    dispatchKey("keydown", code);
  };
  const release = (e: React.PointerEvent) => {
    e.preventDefault();
    dispatchKey("keyup", code);
  };

  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
      onContextMenu={(e) => e.preventDefault()}
      style={{ touchAction: "none" }}
      className={`select-none rounded-xl bg-white/10 active:bg-white/25 border border-white/20 text-white font-bold flex items-center justify-center ${className}`}
    >
      {label}
    </button>
  );
}

function JoystickControls() {
  return (
    <div className="flex items-center justify-between w-full max-w-md mx-auto gap-6 select-none">
      <div className="grid grid-cols-3 grid-rows-2 gap-2 w-40">
        <div />
        <TouchButton code="ArrowUp" label="▲" className="h-14 w-14" />
        <div />
        <TouchButton code="ArrowLeft" label="◀" className="h-14 w-14" />
        <div />
        <TouchButton code="ArrowRight" label="▶" className="h-14 w-14" />
      </div>
      <TouchButton
        code="Space"
        label="FUEGO"
        className="h-20 w-20 rounded-full text-sm"
      />
    </div>
  );
}

function DpadControls() {
  return (
    <div className="flex items-center justify-between w-full max-w-md mx-auto gap-6 select-none">
      <div className="grid grid-cols-3 grid-rows-2 gap-2 w-40">
        <div />
        <TouchButton code="ArrowUp" label="⟳" className="h-14 w-14" />
        <div />
        <TouchButton code="ArrowLeft" label="◀" className="h-14 w-14" />
        <TouchButton code="ArrowDown" label="▼" className="h-14 w-14" />
        <TouchButton code="ArrowRight" label="▶" className="h-14 w-14" />
      </div>
      <TouchButton
        code="Space"
        label="CAÍDA"
        className="h-20 w-20 rounded-full text-xs"
      />
    </div>
  );
}

function DpadHorizontalControls() {
  return (
    <div className="flex items-center justify-center w-full max-w-md mx-auto gap-8 select-none">
      <TouchButton code="ArrowLeft" label="◀" className="h-16 w-24 text-xl" />
      <TouchButton code="ArrowRight" label="▶" className="h-16 w-24 text-xl" />
    </div>
  );
}

export default function TouchControls({ variant }: TouchControlsProps) {
  return (
    <div className="mt-4 flex justify-center">
      {variant === "joystick" && <JoystickControls />}
      {variant === "dpad" && <DpadControls />}
      {variant === "dpad-horizontal" && <DpadHorizontalControls />}
    </div>
  );
}
