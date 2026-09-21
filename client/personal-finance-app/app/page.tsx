import Link from "next/link";
import LandingEntry from "@/components/landing/LandingEntry";
const features = [
  {
    number: "01",
    title: "Track Your Money",
    description:
      "Keep your income, expenses and cashflow organized in one clear financial space.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 3v18h18" />
        <path d="m7 16 4-5 3 3 5-7" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Understand Spending",
    description:
      "See where your money goes and understand your spending patterns without complicated spreadsheets.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3v18" />
        <path d="M17 7.5C17 5.6 15.2 4 12 4S7 5.5 7 7.5 9 11 12 12s5 2.5 5 4.5-2.2 3.5-5 3.5-5-1.6-5-3.5" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Plan Your Goals",
    description:
      "Turn your financial goals into a plan and keep track of your progress over time.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="8.5" />
        <circle cx="12" cy="12" r="4" />
        <path d="m15 9 5-5" />
      </svg>
    ),
  },
  {
    number: "04",
    title: "Get Intelligent Insights",
    description:
      "Use Spendly's insights and financial assistant to understand your money better.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" />
        <path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" />
      </svg>
    ),
  },
];

const steps = [
  {
    number: "01",
    title: "Create Your Profile",
    description:
      "Tell Spendly about your income, expenses and financial goals.",
  },
  {
    number: "02",
    title: "Connect Your Money",
    description:
      "Connect supported accounts or add your financial activity.",
  },
  {
    number: "03",
    title: "Spendly Understands",
    description:
      "Your cashflow, spending patterns and goals come together in one view.",
  },
  {
    number: "04",
    title: "Make Better Decisions",
    description:
      "Use your financial picture and insights to plan your next move.",
  },
];

const capabilities = [
  "Smart Dashboard",
  "Cashflow Tracking",
  "Budget Planning",
  "Financial Goals",
  "Insights Copilot",
  "Financial Advisor",
  "Connected Accounts",
  "Spending Analysis",
];

const faqs = [
  {
    question: "What is Spendly?",
    answer:
      "Spendly is a personal finance assistant designed to bring your money, spending, goals and financial insights together in one place.",
  },
  {
    question: "Who can use Spendly?",
    answer:
      "Spendly is designed for anyone who wants a clearer picture of their personal finances and wants to plan their money more intentionally.",
  },
  {
    question: "Can I track my expenses?",
    answer:
      "Yes. Spendly is designed to help you organize and understand your income, expenses and cashflow.",
  },
  {
    question: "Can I create financial goals?",
    answer:
      "Yes. You can use the goals experience to define financial targets and track progress toward them.",
  },
  {
    question: "Does Spendly provide financial insights?",
    answer:
      "Spendly includes financial insights and an assistant experience designed to help you understand your financial activity.",
  },
  {
    question: "How is my data protected?",
    answer:
      "Spendly uses the authentication and data protection mechanisms implemented in the application. Only security capabilities actually implemented by the application should be considered part of its security model.",
  },
];

export default function Page() {
  return (
    <LandingEntry>
      <main className="landing-page">
      {/* Ambient background */}
      <div className="landing-orb landing-orb-one" />
      <div className="landing-orb landing-orb-two" />
      <div className="landing-grid" />

      {/* HEADER */}
      <header className="landing-header">
        <div className="landing-header-inner">
          <Link href="/" className="landing-logo">
            <img
  src="/favicon.ico"
  alt="SPENDLY"
  className="h-9 w-9 object-contain"
/>
            <span>
              <strong>SPENDLY</strong>
              <small>Personal Finance Assistant</small>
            </span>
          </Link>

          <nav className="landing-nav">
            <a href="#home">Home</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#features">Features</a>
            <a href="#about">About</a>
            <a href="#faq">FAQ</a>
          </nav>

          <Link href="/login" className="landing-header-cta">
            Get Started
            <span>→</span>
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section id="home" className="landing-hero landing-container">
        <div className="landing-hero-content">
          <div className="landing-eyebrow">
            <span className="landing-status-dot" />
            PERSONAL FINANCE, SIMPLIFIED
          </div>

          <h1>
            Take control of your money.
            <span>Build your future.</span>
          </h1>

          <p>
            Spendly is your personal finance assistant that helps you
            understand your cashflow, plan your spending, track your goals,
            and make smarter financial decisions.
          </p>

          <div className="landing-hero-actions">
            <Link href="/login" className="landing-primary-btn">
              Get Started
              <span>→</span>
            </Link>
          </div>

          <div className="landing-trust-row">
            <span>Track</span>
            <i />
            <span>Plan</span>
            <i />
            <span>Understand</span>
            <i />
            <span>Grow</span>
          </div>
        </div>

        {/* Dashboard visual */}
        <div className="landing-hero-visual">
          <div className="landing-dashboard-glow" />

          <div className="landing-dashboard">
            <div className="dashboard-topbar">
              <div>
                <span className="dashboard-mini-dot" />
                <span className="dashboard-mini-dot" />
                <span className="dashboard-mini-dot" />
              </div>

              <div className="dashboard-profile">
                <span />
              </div>
            </div>

            <div className="dashboard-welcome">
              <div>
                <small>GOOD MORNING</small>
                <h3>Your financial overview</h3>
              </div>

              <span className="dashboard-date">This month</span>
            </div>

            <div className="dashboard-balance-card">
              <div className="dashboard-balance-bg" />

              <div className="dashboard-balance-content">
                <div>
                  <small>SAFE TO SPEND</small>
                  <strong>₹24,850</strong>
                  <span>Available this month</span>
                </div>

                <div className="dashboard-balance-icon">
                  ✦
                </div>
              </div>

              <div className="dashboard-wave" />
            </div>

            <div className="dashboard-cards">
              <div className="dashboard-small-card">
                <div className="dashboard-card-title">
                  <span className="dashboard-card-icon green">↗</span>
                  <small>INCOME</small>
                </div>
                <strong>₹58,400</strong>
                <span className="dashboard-positive">+8.4%</span>
              </div>

              <div className="dashboard-small-card">
                <div className="dashboard-card-title">
                  <span className="dashboard-card-icon orange">↘</span>
                  <small>SPENDING</small>
                </div>
                <strong>₹31,250</strong>
                <span className="dashboard-neutral">This month</span>
              </div>
            </div>

            <div className="dashboard-progress">
              <div className="dashboard-progress-header">
                <span>Monthly budget</span>
                <strong>68%</strong>
              </div>
              <div className="dashboard-progress-track">
                <span />
              </div>
            </div>
          </div>

          <div className="landing-floating-card landing-floating-card-one">
            <span className="floating-icon">✓</span>
            <div>
              <small>GOAL PROGRESS</small>
              <strong>72% completed</strong>
            </div>
          </div>

          <div className="landing-floating-card landing-floating-card-two">
            <span className="floating-sparkle">✦</span>
            <div>
              <small>INSIGHT</small>
              <strong>You&apos;re on track</strong>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT IS SPENDLY */}
      <section className="landing-section" id="about">
        <div className="landing-container">
          <div className="landing-section-heading">
            <div>
              <span className="landing-section-label">WHAT IS SPENDLY?</span>
              <h2>
                One place for your
                <span> entire financial life.</span>
              </h2>
            </div>

            <p>
              Your financial information shouldn&apos;t feel scattered. Spendly
              brings the important pieces together so you can understand
              where you are and where you&apos;re going.
            </p>
          </div>

          <div className="landing-feature-grid">
            {features.map((feature) => (
              <article className="landing-feature-card" key={feature.number}>
                <div className="feature-card-top">
                  <span className="feature-number">{feature.number}</span>
                  <div className="feature-icon">{feature.icon}</div>
                </div>

                <h3>{feature.title}</h3>
                <p>{feature.description}</p>

                <span className="feature-arrow">↗</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="landing-section landing-section-soft" id="how-it-works">
        <div className="landing-container">
          <div className="landing-centered-heading">
            <span className="landing-section-label">HOW IT WORKS</span>
            <h2>
              From scattered numbers to
              <span> one clear picture.</span>
            </h2>
            <p>
              Spendly turns your financial activity into something you can
              actually understand and act on.
            </p>
          </div>

          <div className="landing-steps">
            {steps.map((step, index) => (
              <div className="landing-step" key={step.number}>
                <div className="step-number">{step.number}</div>

                <div className="step-content">
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>

                {index !== steps.length - 1 && (
                  <div className="step-line" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="landing-section" id="features">
        <div className="landing-container">
          <div className="landing-section-heading">
            <div>
              <span className="landing-section-label">BUILT FOR YOUR MONEY</span>
              <h2>
                Everything you need.
                <span> Nothing you don&apos;t.</span>
              </h2>
            </div>

            <p>
              A focused financial workspace built around the things that
              actually matter when managing your money.
            </p>
          </div>

          <div className="landing-capabilities">
            {capabilities.map((item, index) => (
              <div className="landing-capability" key={item}>
                <span className="capability-check">✓</span>
                <span>{item}</span>
                <small>0{index + 1}</small>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DASHBOARD SHOWCASE */}
      <section className="landing-showcase">
        <div className="landing-container">
          <div className="showcase-wrapper">
            <div className="showcase-content">
              <span className="landing-section-label">YOUR MONEY</span>

              <h2>
                Your money.
                <span> One clear picture.</span>
              </h2>

              <p>
                From income and expenses to goals and insights, Spendly brings
                your financial information together into one understandable
                experience.
              </p>

              <div className="showcase-points">
                <div>
                  <span>✓</span>
                  <p>See your financial position at a glance</p>
                </div>
                <div>
                  <span>✓</span>
                  <p>Understand your monthly spending</p>
                </div>
                <div>
                  <span>✓</span>
                  <p>Keep your goals visible and actionable</p>
                </div>
              </div>
            </div>

            <div className="showcase-mini-dashboard">
              <div className="showcase-mini-header">
                <span>Overview</span>
                <span>September 2026</span>
              </div>

              <div className="showcase-total">
                <small>TOTAL BALANCE</small>
                <strong>₹1,48,250</strong>
                <span>↑ 12.8% this month</span>
              </div>

              <div className="showcase-chart">
                <span className="chart-line chart-line-one" />
                <span className="chart-line chart-line-two" />
                <span className="chart-line chart-line-three" />

                <svg viewBox="0 0 500 150" preserveAspectRatio="none">
                  <path
                    d="M0 125 C50 112 65 118 100 95 C135 73 150 95 190 82 C225 70 250 78 280 55 C315 31 330 62 360 47 C395 30 420 43 445 20 C465 5 480 18 500 8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                </svg>
              </div>

              <div className="showcase-mini-bottom">
                <div>
                  <small>INCOME</small>
                  <strong>₹58,400</strong>
                </div>
                <div>
                  <small>EXPENSES</small>
                  <strong>₹31,250</strong>
                </div>
                <div>
                  <small>SAVINGS</small>
                  <strong>₹27,150</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY SPENDLY */}
      <section className="landing-section">
        <div className="landing-container">
          <div className="landing-centered-heading">
            <span className="landing-section-label">WHY SPENDLY</span>
            <h2>
              Money management,
              <span> without the noise.</span>
            </h2>
          </div>

          <div className="landing-why-grid">
            <div>
              <strong>Clarity</strong>
              <p>
                Turn financial information into a simple picture you can
                understand.
              </p>
            </div>

            <div>
              <strong>Personalized</strong>
              <p>
                Your financial picture is unique. Spendly is built around
                your own information and goals.
              </p>
            </div>

            <div>
              <strong>Goal-Oriented</strong>
              <p>
                Keep your financial goals connected to your everyday money
                decisions.
              </p>
            </div>

            <div>
              <strong>Data-Driven</strong>
              <p>
                Make decisions with a better understanding of your actual
                financial activity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section className="landing-about-section">
        <div className="landing-container">
          <div className="landing-about">
            <div></div>

            <div>
              <span className="landing-section-label">ABOUT SPENDLY</span>

              <h2>
                Built to make money management
                <span> simpler.</span>
              </h2>

              <p>
                Spendly brings tracking, planning, goals and financial
                insights together into one experience. The idea is simple:
                your financial tools should help you understand your money,
                not make managing it feel more complicated.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECURITY */}
      <section className="landing-section landing-security">
        <div className="landing-container">
          <div className="security-card">
            <div className="security-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M12 3 20 6v5c0 5.2-3.4 8.7-8 10-4.6-1.3-8-4.8-8-10V6l8-3Z" />
                <path d="m8.5 12 2.2 2.2 4.8-5" />
              </svg>
            </div>

            <div>
              <span className="landing-section-label">SECURITY & PRIVACY</span>
              <h2>
                Your financial information
                <span> matters.</span>
              </h2>
              <p>
                Spendly uses the authentication and data protection mechanisms
                implemented within the application to keep your financial
                experience protected.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="landing-section landing-section-soft" id="faq">
        <div className="landing-container landing-faq-container">
          <div className="landing-centered-heading">
            <span className="landing-section-label">FAQ</span>
            <h2>
              Questions?
              <span> We&apos;ve got answers.</span>
            </h2>
          </div>

          <div className="landing-faq-list">
            {faqs.map((faq) => (
              <details key={faq.question} className="landing-faq-item">
                <summary>
                  <span>{faq.question}</span>
                  <b>+</b>
                </summary>

                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="landing-final-cta">
        <div className="landing-final-glow" />

        <div className="landing-container">
          <span className="landing-section-label">START YOUR JOURNEY</span>

          <h2>
            Your money has a plan.
            <span> Now give it a direction.</span>
          </h2>

          <p>
            Build a clearer picture of your finances with Spendly.
          </p>

          <Link href="/login" className="landing-primary-btn landing-final-btn">
            Get Started
            <span>→</span>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-main">
            <Link href="/" className="landing-logo">
              <img
  src="/favicon.ico"
  alt="SPENDLY"
  className="h-9 w-9 object-contain"
/>
              <span>
                <strong>SPENDLY</strong>
                <small>Personal Finance Assistant</small>
              </span>
            </Link>

            <p>
              Understand your money. Plan your future.
            </p>

            <Link href="/login" className="landing-footer-cta">
              Get Started →
            </Link>
          </div>

          <div className="landing-footer-bottom">
            <span>© 2026 Spendly. All rights reserved.</span>

            <div>
             
            </div>
          </div>
        </div>
            </footer>
    </main>
  </LandingEntry>
  );
}