import ControlPageShell from '../../../components/control/ControlPageShell';
import { useSimulation } from '../../../lib/simulation-context';

export default function Ro1ControlPage() {
  const { sim, actions } = useSimulation();

  return (
    <ControlPageShell title="一级反渗透模块设置" summary="调节运行压力、回收率和启停状态">
      <div className="field">
        <label htmlFor="ro1-pressure">运行压力 (MPa)</label>
        <div className="field-control">
          <input
            id="ro1-pressure"
            type="range"
            min="1.8"
            max="2.2"
            step="0.01"
            value={sim.ro1.pressure}
            onChange={(e) => {
              const pressure = actions.clamp(Number(e.target.value), 1.8, 2.2);
              actions.setRo1({ pressure });
            }}
          />
          <span>{sim.ro1.pressure.toFixed(2)}</span>
        </div>
      </div>

      <div className="field">
        <label htmlFor="ro1-recovery">回收率 (%)</label>
        <div className="field-control">
          <input
            id="ro1-recovery"
            type="range"
            min="65"
            max="72"
            step="0.1"
            value={sim.ro1.recovery}
            onChange={(e) => {
              const recovery = actions.clamp(Number(e.target.value), 65, 72);
              actions.setRo1({ recovery });
            }}
          />
          <span>{sim.ro1.recovery.toFixed(1)}</span>
        </div>
      </div>

      <div className="field switch-field">
        <label htmlFor="ro1-switch">启停状态</label>
        <input
          id="ro1-switch"
          type="checkbox"
          checked={sim.ro1.running}
          onChange={(e) => actions.setRo1({ running: e.target.checked })}
        />
      </div>
    </ControlPageShell>
  );
}
