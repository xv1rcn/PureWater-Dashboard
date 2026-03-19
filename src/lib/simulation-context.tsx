import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

const BASE_FLOW = 40;
const TICK_MS = 1000;
const GAUGE_REFRESH_MIN = 5000;
const GAUGE_REFRESH_MAX = 10000;

// 类型定义
export interface RoModule {
	pressure: number;
	recovery: number;
	running: boolean;
}
export interface FilterModule {
	pressureDiff: number;
	life: number;
	cycle: number;
	lifeSwitchThreshold: number;
}
export interface EdiModule {
	current: number;
	running: boolean;
	resistivity: number;
}
export interface ResinModule {
	saltKg: number;
	status: string;
	runSeconds: number;
	regenSeconds: number;
}
export interface BatteryModule {
	enabled: boolean;
	percent: number;
	status: string;
}
export interface Metrics {
	flow: number;
	pressureInlet: number;
	generatorPower: number;
	cycleFlow: number;
	batteryKwh: number;
}
export interface SimState {
	ro1: RoModule;
	ro2: RoModule;
	filter: FilterModule;
	edi: EdiModule;
	resin: ResinModule;
	battery: BatteryModule;
	metrics: Metrics;
	secCounter: number;
}

export interface SimActions {
	setRo1: (changes: Partial<RoModule>) => void;
	setRo2: (changes: Partial<RoModule>) => void;
	setFilter: (changes: Partial<FilterModule>) => void;
	resetFilterLife: () => void;
	setEdi: (changes: Partial<EdiModule>) => void;
	applySaltDose: (value: number) => string | null;
	toggleBattery: () => void;
	computeResistivity: (current: number) => number;
	clamp: (value: number, min: number, max: number) => number;
}

export interface SimContext {
	sim: SimState;
	actions: SimActions;
}

const SimulationContext = createContext<SimContext | null>(null);

function clamp(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}

function randomDelta(range: number) {
	return (Math.random() * 2 - 1) * range;
}

function computeResistivity(current: number) {
	const currentOffset = current - 6;
	return clamp(17.85 + currentOffset * 0.25 + randomDelta(0.02), 17.5, 18.2);
}

function computeBatteryStatus(sim: SimState) {
	if (!sim.battery.enabled) {
		return '待机';
	}
	const hasLoad = sim.ro1.running || sim.ro2.running || sim.edi.running;
	const canCharge = sim.metrics.generatorPower >= 18 && sim.battery.percent < 100;
	if (hasLoad && sim.battery.percent > 0) {
		return '放电中';
	}
	if (canCharge) {
		return '充电中';
	}
	return '待机';
}

function computeMetrics(sim: SimState) {
	const flow = clamp(BASE_FLOW + randomDelta(2), 38, 42);
	const pressureInlet = clamp(0.7 + (flow - 40) * 0.01 + (sim.ro1.running ? randomDelta(0.03) : 0), 0.6, 0.75);
	const generatorPower = clamp(20 + (flow - 40) * 0.5 + randomDelta(0.2), 18, 22);
	const cycleFlow = clamp(flow * 0.5 + (sim.ro2.running ? randomDelta(0.5) : 0), 19, 21);
	const batteryKwh = 35 + (sim.battery.percent / 100) * 10;
	return { flow, pressureInlet, generatorPower, cycleFlow, batteryKwh };
}

export function SimulationProvider({ children }: { children: ReactNode }) {
	const [sim, setSim] = useState<SimState>(() => ({
		ro1: { pressure: 2.0, recovery: 68.0, running: false },
		ro2: { pressure: 1.4, recovery: 82.0, running: false },
		filter: { pressureDiff: 0.12, life: 90, cycle: 24, lifeSwitchThreshold: 20 },
		edi: { current: 6.0, running: false, resistivity: 17.85 },
		resin: { saltKg: 600, status: '健康', runSeconds: 0, regenSeconds: 0 },
		battery: { enabled: true, percent: 78, status: '待机' },
		metrics: { flow: 40, pressureInlet: 0.7, generatorPower: 20, cycleFlow: 20, batteryKwh: 42.8 },
		secCounter: 0,
	}));

	useEffect(() => {
		const tickId = window.setInterval(() => {
			setSim((prev) => {
				const secCounter = prev.secCounter + 1;
				const next = {
					...prev,
					secCounter,
					edi: {
						...prev.edi,
						resistivity: computeResistivity(prev.edi.current),
					},
					battery: {
						...prev.battery,
					},
					filter: {
						...prev.filter,
					},
					resin: {
						...prev.resin,
					},
					metrics: {
						...prev.metrics,
					},
				};

				next.battery.status = computeBatteryStatus(next);

				if (next.battery.enabled && next.battery.status !== '待机' && secCounter % 10 === 0) {
					let step = next.battery.status === '充电中' ? 1 : -1.5;
					if (next.battery.status === '放电中' && next.edi.running) {
						step -= 1;
					}
					next.battery.percent = clamp(next.battery.percent + step, 0, 100);
				}

				next.metrics.batteryKwh = 35 + (next.battery.percent / 100) * 10;

				if (secCounter % 30 === 0) {
					next.filter.life = clamp(next.filter.life - 1, 0, 100);
				}

				const isRunning = next.ro1.running || next.ro2.running || next.edi.running;
				if (isRunning) {
					next.resin.runSeconds += 1;
				}

				const runHours = next.resin.runSeconds / 3600;
				if (next.resin.saltKg >= 200 && runHours < 2) {
					next.resin.status = '健康';
					next.resin.regenSeconds = 0;
				} else {
					next.resin.status = '需再生';
					next.resin.regenSeconds += 1;
				}

				if (next.resin.saltKg === 0 && next.resin.regenSeconds >= 1800) {
					next.resin.status = '失效';
				}

				return next;
			});
		}, TICK_MS);

		return () => window.clearInterval(tickId);
	}, []);

	useEffect(() => {
		let timeoutId: number;

		const loop = () => {
			setSim((prev) => {
				const metrics = computeMetrics(prev);
				const battery = {
					...prev.battery,
				};
				const next = {
					...prev,
					metrics,
					battery,
				};
				next.battery.status = computeBatteryStatus(next);
				return next;
			});

			const delay = GAUGE_REFRESH_MIN + Math.random() * (GAUGE_REFRESH_MAX - GAUGE_REFRESH_MIN);
			timeoutId = window.setTimeout(loop, delay);
		};

		loop();

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, []);

	const actions: SimActions = {
		setRo1(changes) {
			setSim((prev) => ({ ...prev, ro1: { ...prev.ro1, ...changes } }));
		},
		setRo2(changes) {
			setSim((prev) => ({ ...prev, ro2: { ...prev.ro2, ...changes } }));
		},
		setFilter(changes) {
			setSim((prev) => ({ ...prev, filter: { ...prev.filter, ...changes } }));
		},
		resetFilterLife() {
			setSim((prev) => ({ ...prev, filter: { ...prev.filter, life: 100 } }));
		},
		setEdi(changes) {
			setSim((prev) => ({ ...prev, edi: { ...prev.edi, ...changes } }));
		},
		applySaltDose(value) {
			if (Number.isNaN(value) || value < 0) {
				return '请输入有效投料量。';
			}
			let error: string | null = null;
			setSim((prev) => {
				if (value > prev.resin.saltKg) {
					error = '投料量超出剩余储量，请重新输入。';
					return prev;
				}
				return {
					...prev,
					resin: {
						...prev.resin,
						saltKg: clamp(prev.resin.saltKg - value, 0, 800),
						status: '健康',
						regenSeconds: 0,
					},
				};
			});
			return error;
		},
		toggleBattery() {
			setSim((prev) => ({
				...prev,
				battery: {
					...prev.battery,
					enabled: !prev.battery.enabled,
					status: prev.battery.enabled ? '待机' : prev.battery.status,
				},
			}));
		},
		computeResistivity,
		clamp,
	};

	const value: SimContext = useMemo(() => ({ sim, actions }), [sim, actions]);
	return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
}

export function useSimulation(): SimContext {
	const context = useContext(SimulationContext);
	if (!context) {
		throw new Error('useSimulation 必须在 SimulationProvider 内使用');
	}
	return context;
}

export interface GaugeDef {
	id: string;
	title: string;
	unit: string;
	min: number;
	max: number;
	decimals: number;
	rangeText: string;
}
export const dashboardGaugeDefs: GaugeDef[] = [
	{ id: 'gauge1', title: '原水流量', unit: 'm3/h', min: 38, max: 42, decimals: 2, rangeText: '范围: 38 - 42 m3/h' },
	{ id: 'gauge2', title: '浓盐水进口压力', unit: 'MPa', min: 0.6, max: 0.75, decimals: 3, rangeText: '范围: 0.6 - 0.75 MPa' },
	{ id: 'gauge3', title: '余压发电机功率', unit: 'kW', min: 18, max: 22, decimals: 2, rangeText: '范围: 18 - 22 kW' },
	{ id: 'gauge4', title: '浓盐循环流量', unit: 'm3/h', min: 19, max: 21, decimals: 2, rangeText: '范围: 19 - 21 m3/h' },
	{ id: 'gauge5', title: '蓄电池储能', unit: 'kWh', min: 35, max: 45, decimals: 2, rangeText: '范围: 35 - 45 kWh' },
];

export function createGaugeOption(def: GaugeDef) {
	return {
		animationDuration: 400,
		series: [
			{
				type: 'gauge',
				min: def.min,
				max: def.max,
				splitNumber: 5,
				axisLine: {
					lineStyle: {
						width: 12,
						color: [[1, '#008a4b']],
					},
				},
				pointer: {
					icon: 'path://M8 0L-8 0L0 70z',
					width: 8,
					length: '64%',
					itemStyle: { color: '#0b6f42' },
				},
				axisTick: { distance: -16, splitNumber: 4 },
				splitLine: { distance: -16, length: 10 },
				axisLabel: {
					color: '#607a74',
					distance: 18,
					fontSize: 10,
				},
				detail: {
					formatter: (value: number) => `${value.toFixed(def.decimals)} ${def.unit}`,
					fontSize: 15,
					fontWeight: 700,
					offsetCenter: [0, '100%'],
					color: '#17312b',
				},
				title: { show: false },
				data: [{ value: def.min }],
			},
		],
	};
}