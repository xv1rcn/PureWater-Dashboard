import ControlPageShell from '../../../components/control/ControlPageShell';
import { useSimulation } from '../../../lib/simulation-context';

export default function EdiControlPage() {
  const { sim, actions } = useSimulation();

  return (
    <ControlPageShell title="EDI 系统模块设置" summary="调节电流并控制系统启停">
      <div className="field">
        <label htmlFor="edi-current">电流 (A)</label>
        <div className="field-control">
          <input
            id="edi-current"
            type="range"
            min="5"
            max="7"
            step="0.01"
            value={sim.edi.current}
            onChange={(e) => {
              const current = actions.clamp(Number(e.target.value), 5, 7);
              actions.setEdi({
                current,
                resistivity: actions.computeResistivity(current),
              });
            }}
          />
          <span>{sim.edi.current.toFixed(2)}</span>
        </div>
      </div>

      <div className="field">
        <label>产水电阻率 (MOhm·cm)</label>
        <div className="field-control">
          <span>{sim.edi.resistivity.toFixed(2)}</span>
        </div>
      </div>

      <div className="field switch-field">
        <label htmlFor="edi-switch">启停状态</label>
        <input
          id="edi-switch"
          type="checkbox"
          checked={sim.edi.running}
          onChange={(e) => actions.setEdi({ running: e.target.checked })}
        />
      </div>
    </ControlPageShell>
  );
}
