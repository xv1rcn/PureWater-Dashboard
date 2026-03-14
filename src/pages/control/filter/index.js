import ControlPageShell from '../../../components/control/ControlPageShell';
import { useSimulation } from '../../../lib/simulation-context';

export default function FilterControlPage() {
  const { sim, actions } = useSimulation();

  return (
    <ControlPageShell title="过滤器模块设置" summary="设置压差、冲洗周期并管理滤芯寿命">
      <div className="field">
        <label htmlFor="filter-diff">过滤压差 (MPa)</label>
        <div className="field-control">
          <input
            id="filter-diff"
            type="number"
            min="0.1"
            max="0.15"
            step="0.01"
            value={sim.filter.pressureDiff}
            onChange={(e) => {
              const pressureDiff = actions.clamp(Number(e.target.value), 0.1, 0.15);
              actions.setFilter({ pressureDiff });
            }}
          />
          <span>{sim.filter.pressureDiff.toFixed(2)}</span>
        </div>
      </div>

      <div className="field">
        <label>滤芯寿命 (%)</label>
        <div className="field-control">
          <span>{sim.filter.life.toFixed(0)}</span>
          <button className="tiny-btn" type="button" onClick={actions.resetFilterLife}>
            更换滤芯
          </button>
        </div>
      </div>

      <div className="field">
        <label htmlFor="filter-cycle">冲洗周期 (h)</label>
        <div className="field-control">
          <input
            id="filter-cycle"
            type="number"
            min="12"
            max="48"
            step="1"
            value={sim.filter.cycle}
            onChange={(e) => {
              const cycle = actions.clamp(Math.round(Number(e.target.value)), 12, 48);
              actions.setFilter({ cycle });
            }}
          />
        </div>
      </div>
    </ControlPageShell>
  );
}
