import '../styles/globals.css';
import '../styles/dashboard.css';
import { SimulationProvider } from '../lib/simulation-context';

export default function App({ Component, pageProps }) {
  return (
    <SimulationProvider>
      <Component {...pageProps} />
    </SimulationProvider>
  );
}
