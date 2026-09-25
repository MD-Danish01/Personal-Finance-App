"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

const navLinks = [
  { href: "#home", label: "Home" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#features", label: "Features" },
  { href: "#about", label: "About" },
  { href: "#faq", label: "FAQ" },
];

export default function LandingHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Monitor scroll for subtle elevation enhancement
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  // Handle smooth scroll when navigating to anchor links
  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      setIsMobileMenuOpen(false);
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  return (
    <header
      className={`landing-header ${
        isScrolled ? "landing-header-elevated" : ""
      } ${isMobileMenuOpen ? "mobile-menu-active" : ""}`}
    >
      <div className="landing-header-inner">
        <Link
          href="/"
          className="landing-logo"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <Image
            src="/logo.png"
            alt="SPENDLY"
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
            priority
          />
          <span>
            <strong>SPENDLY</strong>
            <small>Personal Finance Assistant</small>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="landing-nav" aria-label="Main Navigation">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Header Right Actions */}
        <div className="landing-header-actions">
          <Link href="/login" className="landing-header-cta">
            Get Started
            <span>→</span>
          </Link>

          {/* Mobile Menu Hamburger Button */}
          <button
            type="button"
            className={`landing-mobile-toggle ${
              isMobileMenuOpen ? "is-active" : ""
            }`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
          >
            <span className="hamburger-line line-1" />
            <span className="hamburger-line line-2" />
            <span className="hamburger-line line-3" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div
          className="landing-mobile-backdrop"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Navigation Sheet */}
      <div
        className={`landing-mobile-menu ${
          isMobileMenuOpen ? "is-open" : ""
        }`}
        aria-hidden={!isMobileMenuOpen}
      >
        <div className="landing-mobile-menu-inner">
          <nav className="landing-mobile-nav" aria-label="Mobile Navigation">
            {navLinks.map((link, index) => (
              <a
                key={link.href}
                href={link.href}
                className="landing-mobile-nav-item"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={(e) => handleNavClick(e, link.href)}
              >
                <span>{link.label}</span>
                <span className="mobile-nav-arrow">→</span>
              </a>
            ))}
          </nav>

          <div className="landing-mobile-footer">
            <Link
              href="/login"
              className="landing-primary-btn landing-mobile-cta"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Get Started Free
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
