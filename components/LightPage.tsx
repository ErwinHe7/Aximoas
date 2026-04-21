import { ParticleDust } from './ParticleDust';

/**
 * Wraps all non-Home pages. Applies warm gold background, dark text,
 * and particle dust for 3D organic feel.
 */
export function LightPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-light relative">
      <ParticleDust />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
