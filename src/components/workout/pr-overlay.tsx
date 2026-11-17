"use client";

export type PRCelebration = {
  exerciseName: string;
  units: string;
  newWeight: number;
  isWeightPR: boolean;
  isE1RMPR: boolean;
  prevBestWeight: number;
  prevBestE1RM: number;
  newE1RM: number;
};

export function PROverlay({ pr, onClose }: { pr: PRCelebration; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="New personal record"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg/95 px-6 backdrop-blur"
      onClick={onClose}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-accent">New personal record</p>
      <p className="mt-3 text-center font-serif text-5xl leading-none">{pr.exerciseName}</p>
      <div className="mt-8 flex gap-3">
        {pr.isWeightPR ? (
          <div className="rounded-2xl border border-accent/30 bg-accent/10 px-6 py-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Heaviest</p>
            <p className="tabular mt-1 font-serif text-4xl text-accent">
              {pr.newWeight} <span className="text-lg">{pr.units}</span>
            </p>
            <p className="text-xs text-muted-2">{pr.prevBestWeight > 0 ? `↑ from ${pr.prevBestWeight}` : "First record"}</p>
          </div>
        ) : null}
        {pr.isE1RMPR ? (
          <div className="rounded-2xl border border-accent/30 bg-accent/10 px-6 py-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Est. 1RM</p>
            <p className="tabular mt-1 font-serif text-4xl text-accent">{pr.newE1RM}</p>
            <p className="text-xs text-muted-2">{pr.prevBestE1RM > 0 ? `↑ from ${pr.prevBestE1RM}` : "First record"}</p>
          </div>
        ) : null}
      </div>
      <p className="mt-10 text-sm text-muted">Tap anywhere to continue</p>
    </div>
  );
}
