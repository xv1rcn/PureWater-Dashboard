import type { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from 'next';
import { ChangeEvent } from 'react';
import ControlPageShell from '../../components/control/ControlPageShell';
import { useSimulation } from '../../lib/simulation-context';

type ControlModule = 'ro1' | 'ro2' | 'filter' | 'edi';

interface ControlPageProps {
  module: ControlModule;
}

const SUPPORTED_MODULES: ControlModule[] = ['ro1', 'ro2', 'filter', 'edi'];

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: SUPPORTED_MODULES.map((module) => ({ params: { module } })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<ControlPageProps> = async ({ params }) => {
  const module = params?.module;
  if (typeof module !== 'string' || !SUPPORTED_MODULES.includes(module as ControlModule)) {
    return { notFound: true };
  }

  return {
    props: {
      module: module as ControlModule,
    },
  };
};

export default function ControlModulePage({ module }: InferGetStaticPropsType<typeof getStaticProps>) {
  const { sim, actions } = useSimulation();

  if (module === 'ro1') {
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
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
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
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
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
            onChange={(e: ChangeEvent<HTMLInputElement>) => actions.setRo1({ running: e.target.checked })}
          />
        </div>
      </ControlPageShell>
    );
  }

  if (module === 'ro2') {
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
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
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
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
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
            onChange={(e: ChangeEvent<HTMLInputElement>) => actions.setRo2({ running: e.target.checked })}
          />
        </div>
      </ControlPageShell>
    );
  }

  if (module === 'filter') {
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
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
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
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const cycle = actions.clamp(Math.round(Number(e.target.value)), 12, 48);
                actions.setFilter({ cycle });
              }}
            />
          </div>
        </div>
      </ControlPageShell>
    );
  }

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
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
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
          onChange={(e: ChangeEvent<HTMLInputElement>) => actions.setEdi({ running: e.target.checked })}
        />
      </div>
    </ControlPageShell>
  );
}
