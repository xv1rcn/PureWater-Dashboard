import Head from 'next/head';
import Link from 'next/link';

export default function ControlPageShell({ title, summary, children }) {
  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>

      <main className="settings-page">
        <section className="panel settings-panel">
          <h1>{title}</h1>
          <p className="settings-subtitle">{summary}</p>

          {children}

          <div className="dialog-actions">
            <Link className="ghost-btn back-link" href="/">
              返回监控主页
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
