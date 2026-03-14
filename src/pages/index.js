import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createGaugeOption, dashboardGaugeDefs, useSimulation } from '../lib/simulation-context';

export default function DashboardPage() {
  const { sim, actions } = useSimulation();
  const [saltDose, setSaltDose] = useState('');
  const chartsRef = useRef([]);

  useEffect(() => {
    let disposed = false;

    import('echarts').then((echarts) => {
      if (disposed) {
        return;
      }
      chartsRef.current = dashboardGaugeDefs
        .map((def) => {
          const node = document.getElementById(def.id);
          if (!node) {
            return null;
          }
          const chart = echarts.init(node);
          chart.setOption(createGaugeOption(def));
          return chart;
        })
        .filter(Boolean);

      const onResize = () => {
        chartsRef.current.forEach((chart) => chart.resize());
      };
      window.addEventListener('resize', onResize);

      return () => {
        window.removeEventListener('resize', onResize);
      };
    });

    return () => {
      disposed = true;
      chartsRef.current.forEach((chart) => chart.dispose());
      chartsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!chartsRef.current.length) {
      return;
    }

    const values = [
      sim.metrics.flow,
      sim.metrics.pressureInlet,
      sim.metrics.generatorPower,
      sim.metrics.cycleFlow,
      sim.metrics.batteryKwh,
    ];

    chartsRef.current.forEach((chart, index) => {
      chart.setOption({
        series: [{ data: [{ value: values[index] }] }],
      });
    });
  }, [sim.metrics]);

  const summary = useMemo(() => {
    const statusText = (running) => (running ? '运行' : '停止');
    return {
      ro1: `压力 ${sim.ro1.pressure.toFixed(2)} MPa | 回收率 ${sim.ro1.recovery.toFixed(1)}% | ${statusText(sim.ro1.running)}`,
      ro2: `压力 ${sim.ro2.pressure.toFixed(2)} MPa | 回收率 ${sim.ro2.recovery.toFixed(1)}% | ${statusText(sim.ro2.running)}`,
      filter: `压差 ${sim.filter.pressureDiff.toFixed(2)} MPa | 寿命 ${sim.filter.life.toFixed(0)}% | 周期 ${sim.filter.cycle}h`,
      edi: `电流 ${sim.edi.current.toFixed(2)} A | 电阻率 ${sim.edi.resistivity.toFixed(2)} MOhm·cm | ${statusText(sim.edi.running)}`,
    };
  }, [sim]);

  const resinLevel = actions.clamp((sim.resin.saltKg / 800) * 100, 0, 100);
  const batteryCircleLength = 2 * Math.PI * 50;
  const batteryOffset = batteryCircleLength * (1 - sim.battery.percent / 100);

  const applySaltDose = () => {
    const value = Number(saltDose);
    const error = actions.applySaltDose(value);
    if (error) {
      window.alert(error);
      return;
    }
    setSaltDose('');
  };

  return (
    <>
      <Head>
        <title>纯水制备优化装置仿真监控模型</title>
      </Head>

      <header className="top-bar">
        <h1>一种基于树脂软化-余压回收-浓盐循环的纯水制备优化装置</h1>
        <p>Next.js + Electron 双模式 | 40 m3/h 基准工况</p>
      </header>

      <main className="main-content">
        <section className="dashboard-section" aria-label="实时监测仪表盘">
          {dashboardGaugeDefs.map((def) => (
            <div className="gauge-card" key={def.id}>
              <div className="gauge-title">{def.title}</div>
              <div id={def.id} className="gauge" />
              <div className="gauge-range">{def.rangeText}</div>
            </div>
          ))}
        </section>

        <section className="modules-section">
          <section className="panel control-center">
            <div className="panel-header">
              <h2>设备控制中心</h2>
              <span>点击模块设置参数</span>
            </div>
            <div className="module-grid">
              <Link className="module-card module-link" href="/control/ro1">
                <h3>一级反渗透模块</h3>
                <p>{summary.ro1}</p>
              </Link>
              <Link className="module-card module-link" href="/control/ro2">
                <h3>二级反渗透模块</h3>
                <p>{summary.ro2}</p>
              </Link>
              <Link className="module-card module-link" href="/control/filter">
                <h3>过滤器模块</h3>
                <p>{summary.filter}</p>
              </Link>
              <Link className="module-card module-link" href="/control/edi">
                <h3>EDI 系统模块</h3>
                <p>{summary.edi}</p>
              </Link>
            </div>
          </section>

          <section className="right-stack">
            <section className="panel resin-panel">
              <div className="panel-header">
                <h2>树脂再生盐投料系统</h2>
                <span>当前区域手动控制</span>
              </div>

              <div className="metric-row">
                <div className="metric-label">再生盐储存量</div>
                <div className="metric-value">{sim.resin.saltKg.toFixed(0)} kg</div>
              </div>
              <div className="bar-track" aria-hidden="true">
                <div className="bar-fill" style={{ width: `${resinLevel}%` }} />
              </div>

              <div className="metric-row resin-state">
                <div className="metric-label">离子交换树脂状态</div>
                <div className="resin-status-wrap">
                  <span
                    className={`state-dot ${
                      sim.resin.status === '健康' ? 'healthy' : sim.resin.status === '需再生' ? 'warn' : 'error'
                    }`}
                  />
                  <span
                    className={`state-text ${
                      sim.resin.status === '健康' ? 'healthy' : sim.resin.status === '需再生' ? 'warn' : 'error'
                    }`}
                  >
                    {sim.resin.status}
                  </span>
                </div>
              </div>
              <div className="runtime-info">累计运行时长: {(sim.resin.runSeconds / 3600).toFixed(2)} h</div>

              <div className="salt-control">
                <label htmlFor="salt-dose">手动投盐 (kg)</label>
                <div className="input-with-btn">
                  <input
                    id="salt-dose"
                    type="number"
                    min="0"
                    step="1"
                    value={saltDose}
                    onChange={(e) => setSaltDose(e.target.value)}
                    placeholder="输入投料量"
                  />
                  <button id="confirm-salt" type="button" onClick={applySaltDose}>
                    确认投料
                  </button>
                </div>
                <small>输入范围: 0 到当前剩余储量</small>
              </div>
            </section>

            <section className="panel battery-panel">
              <div className="panel-header">
                <h2>蓄电池管理系统</h2>
                <span>状态展示 + 手动开关</span>
              </div>

              <div className="battery-layout">
                <div className="battery-ring-wrap">
                  <svg className="battery-ring" viewBox="0 0 120 120" aria-label="电量百分比">
                    <circle cx="60" cy="60" r="50" className="ring-bg" />
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      className="ring-progress"
                      style={{
                        strokeDasharray: batteryCircleLength,
                        strokeDashoffset: batteryOffset,
                      }}
                    />
                  </svg>
                  <div className="battery-percent">{sim.battery.percent.toFixed(1)}%</div>
                </div>

                <div className="battery-info">
                  <div className="metric-row">
                    <div className="metric-label">充放电状态</div>
                    <div className="metric-value">{sim.battery.status}</div>
                  </div>
                  <div className="metric-row">
                    <div className="metric-label">储能量</div>
                    <div className="metric-value">{sim.metrics.batteryKwh.toFixed(2)} kWh</div>
                  </div>
                  <button
                    className="toggle-btn"
                    type="button"
                    onClick={actions.toggleBattery}
                  >
                    蓄电池: {sim.battery.enabled ? '启用' : '禁用'}
                  </button>
                </div>
              </div>
            </section>
          </section>
        </section>
      </main>

    </>
  );
}
