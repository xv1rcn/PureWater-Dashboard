import type { AppProps } from 'next/app';
import '../styles/globals.css';
import '../styles/dashboard.css';
import { SimulationProvider } from '../lib/simulation-context';

export default function App({ Component, pageProps }: AppProps) {
	return (
		<SimulationProvider>
			<Component {...pageProps} />
		</SimulationProvider>
	);
}