import ControlPageShell from '../../../components/control/ControlPageShell';
import { useSimulation } from '../../../lib/simulation-context';

export default function Ro2ControlPage() {
  const { sim, actions } = useSimulation();

  return (
    <ControlPageShell title="二级反渗透模块设置" summary="调节运行压力、回收率和启停状态">
      <div className="field">
        <label htmlFor="ro2-pressure">运行压力 (MPa)</label>
        <div className="field-control">
          <input
            id="ro2-pressure"
            type="range"
            min="1.2"
            max="1.6"
            step="0.01"
            value={sim.ro2.pressure}
            onChange={(e) => {
              const pressure = actions.clamp(Number(e.target.value), 1.2, 1.6);
              actions.setRo2({ pressure });
            }}
          />
          <span>{sim.ro2.pressure.toFixed(2)}</span>
        </div>
      </div>

      <div className="field">
        <label htmlFor="ro2-recovery">回收率 (%)</label>
        <div className="field-control">
          <input
            id="ro2-recovery"
            type="range"
            min="80"
            max="85"
            step="0.1"
            value={sim.ro2.recovery}
            onChange={(e) => {
              const recovery = actions.clamp(Number(e.target.value), 80, 85);
              actions.setRo2({ recovery });
            }}
          />
          <span>{sim.ro2.recovery.toFixed(1)}</span>
        </div>
      </div>

      <div className="field switch-field">
        <label htmlFor="ro2-switch">启停状态</label>
        <input
          id="ro2-switch"
          type="checkbox"
          checked={sim.ro2.running}
          onChange={(e) => actions.setRo2({ running: e.target.checked })}
        />
      </div>
    </ControlPageShell>
  );
}
