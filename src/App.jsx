import "./App.css";

function App() {
  return (
    <div className="page">
      <header className="top-nav">
        <div className="brand">
          <svg className="logo-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2L2 20h20L12 2z" fill="white" />
          </svg>
          <span className="brand-name">ALTITUDE</span>
        </div>
        <nav className="nav-links" aria-label="Primary">
          {["Platform", "Solutions", "Resources", "Customers", "Pricing"].map((item) => (
            <button key={item} type="button" className="nav-link">{item}</button>
          ))}
        </nav>
        <button type="button" className="nav-cta">Get Started Free</button>
      </header>

      <main className="hero">
        <div className="hero-inner">
          <h1 className="reveal" style={{ "--delay": "80ms" }}>
            Intelligence For<br />What's Next
          </h1>
          <p className="subhead reveal" style={{ "--delay": "180ms" }}>
            Altitude delivers adaptive insights that help teams<br />
            anticipate change, act faster, and exceed what's possible.
          </p>
          <div className="cta-row reveal" style={{ "--delay": "260ms" }}>
            <button type="button" className="primary">Start Exploring</button>
          </div>
        </div>
      </main>

      <footer className="trust reveal" style={{ "--delay": "380ms" }}>
        <span className="trust-label">TRUSTED BY INNOVATIVE TEAMS</span>
        <div className="logo-row">
          {[
            { icon: "◈", name: "NORTHLINE" },
            { icon: "✳", name: "Lumina" },
            { icon: "△", name: "VERTEX" },
            { icon: "▷", name: "PIVOT" },
            { icon: "◎", name: "encore" },
            { icon: "☁", name: "stratus" },
          ].map(({ icon, name }) => (
            <div key={name} className="logo-item">
              <span className="logo-icon-sm" aria-hidden="true">{icon}</span>
              <span>{name}</span>
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}

export default App;
