import Head from 'next/head';
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createGaugeOption, dashboardGaugeDefs, useSimulation } from '../lib/simulation-context';

type ControlModule = 'ro1' | 'ro2' | 'filter' | 'edi';

type EChartsType = {
	setOption: (option: unknown) => void;
	resize: () => void;
	dispose: () => void;
};

type EChartsModule = {
	init: (dom: HTMLElement) => EChartsType;
};

export default function DashboardPage() {
	const { sim, actions } = useSimulation();
	const [saltDose, setSaltDose] = useState<string>('');
	const [activeSettings, setActiveSettings] = useState<ControlModule | null>(null);
	const chartsRef = useRef<EChartsType[]>([]);

	useEffect(() => {
		let disposed = false;
		let cleanupResize: (() => void) | null = null;

		import('echarts').then((echarts: EChartsModule) => {
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
				.filter((chart): chart is EChartsType => Boolean(chart));

			const onResize = () => {
				chartsRef.current.forEach((chart) => chart.resize());
			};
			window.addEventListener('resize', onResize);
			cleanupResize = () => window.removeEventListener('resize', onResize);
		});

		return () => {
			disposed = true;
			if (cleanupResize) {
				cleanupResize();
			}
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
		return {
			ro1: `压力 ${sim.ro1.pressure.toFixed(2)} MPa | 回收率 ${sim.ro1.recovery.toFixed(1)}%`,
			ro2: `压力 ${sim.ro2.pressure.toFixed(2)} MPa | 回收率 ${sim.ro2.recovery.toFixed(1)}%`,
			filter: `压差 ${sim.filter.pressureDiff.toFixed(2)} MPa | 寿命 ${sim.filter.life.toFixed(0)}% | 周期 ${sim.filter.cycle}h`,
			edi: `电流 ${sim.edi.current.toFixed(2)} A | 电阻率 ${sim.edi.resistivity.toFixed(2)} MOhm·cm`,
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

	const moduleCards = [
		{
			key: 'ro1',
			icon: 'RO1',
			title: '一级反渗透模块',
			summary: summary.ro1,
			running: sim.ro1.running,
			onToggle: () => actions.setRo1({ running: !sim.ro1.running }),
		},
		{
			key: 'ro2',
			icon: 'RO2',
			title: '二级反渗透模块',
			summary: summary.ro2,
			running: sim.ro2.running,
			onToggle: () => actions.setRo2({ running: !sim.ro2.running }),
		},
		{
			key: 'filter',
			icon: 'FIL',
			title: '过滤器模块',
			summary: summary.filter,
			running: null,
			onToggle: null,
		},
		{
			key: 'edi',
			icon: 'EDI',
			title: 'EDI 系统模块',
			summary: summary.edi,
			running: sim.edi.running,
			onToggle: () => actions.setEdi({ running: !sim.edi.running }),
		},
	] as const;

	const getIconStatusClass = (running: boolean | null) => {
		if (running === true) {
			return 'is-running';
		}
		return 'is-stopped';
	};

	const settingsTitle =
		activeSettings === 'ro1'
			? '一级反渗透模块设置'
			: activeSettings === 'ro2'
				? '二级反渗透模块设置'
				: activeSettings === 'filter'
					? '过滤器模块设置'
					: activeSettings === 'edi'
						? 'EDI 系统模块设置'
						: '';

	return (
		<>
			<Head>
				<title>纯水制备优化装置仿真监控模型</title>
			</Head>

			<header className="top-bar">
				<h1>一种融合再生剂自循环的树脂软化与浓水余压产电的反渗透节能降碳系统</h1>
				<p aria-hidden="true" />
			</header>

			<main className="main-content">
				<section className="dashboard-section" aria-label="实时监测仪表盘">
					{dashboardGaugeDefs.map((def) => (
						<div className="gauge-card" key={def.id}>
							<div className="gauge-title">{def.title}</div>
							<div id={def.id} className="gauge" />
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
							{moduleCards.map((item) => (
								<article className="module-card" key={item.key}>
									<div className="module-card-head">
										<div className={`module-icon ${getIconStatusClass(item.running)}`} aria-hidden="true">
											{item.icon}
										</div>
										<div className="module-title-wrap">
											<h3>{item.title}</h3>
											<p>{item.summary}</p>
										</div>
									</div>
									<div className="module-actions">
										{item.onToggle ? (
											<button
												className={`tiny-btn module-toggle ${item.running ? 'is-running' : ''}`}
												type="button"
												onClick={item.onToggle}
											>
												{item.running ? '停止' : '启动'}
											</button>
										) : (
											<span className="module-toggle-placeholder">仅参数维护</span>
										)}
										<button className="module-link-btn" type="button" onClick={() => setActiveSettings(item.key)}>
											进入设置
										</button>
									</div>
								</article>
							))}
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
										onChange={(e: ChangeEvent<HTMLInputElement>) => setSaltDose(e.target.value)}
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
									<button className="toggle-btn" type="button" onClick={actions.toggleBattery}>
										蓄电池: {sim.battery.enabled ? '启用' : '禁用'}
									</button>
								</div>
							</div>
						</section>
					</section>
				</section>
			</main>

			{activeSettings && (
				<div className="dialog" role="dialog" aria-modal="true" aria-label={settingsTitle} onClick={() => setActiveSettings(null)}>
					<section className="dialog-content" onClick={(e) => e.stopPropagation()}>
						<h3 className="dialog-title">{settingsTitle}</h3>

						{activeSettings === 'ro1' && (
							<>
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
							</>
						)}

						{activeSettings === 'ro2' && (
							<>
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
							</>
						)}

						{activeSettings === 'filter' && (
							<>
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
							</>
						)}

						{activeSettings === 'edi' && (
							<>
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
							</>
						)}

						<div className="dialog-actions">
							<button className="ghost-btn" type="button" onClick={() => setActiveSettings(null)}>
								关闭
							</button>
						</div>
					</section>
				</div>
			)}
		</>
	);
}