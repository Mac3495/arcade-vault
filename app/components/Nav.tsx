"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type StoredUser = { name: string };

const USER_KEY = "av_user";

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem(USER_KEY);
        setUser(raw ? JSON.parse(raw) : null);
      } catch {
        setUser(null);
      }
    };
    read();
    window.addEventListener("storage", read);
    window.addEventListener("av-user-changed", read);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener("av-user-changed", read);
    };
  }, [pathname]);

  const isActive = (name: "home" | "biblioteca" | "salon" | "about" | "auth") => {
    if (name === "home") return pathname === "/";
    if (name === "biblioteca")
      return pathname.startsWith("/biblioteca") || pathname.startsWith("/games");
    if (name === "salon") return pathname.startsWith("/hall-of-fame");
    if (name === "about") return pathname.startsWith("/about");
    return pathname.startsWith("/auth");
  };

  const handleSignOut = () => {
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event("av-user-changed"));
    setUser(null);
    router.push("/");
  };

  const close = () => setOpen(false);

  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo">
          <div className="logo-mark"></div>
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <Link href="/" className={isActive("home") ? "active" : ""}>
            Inicio
          </Link>
          <Link href="/biblioteca" className={isActive("biblioteca") ? "active" : ""}>
            Biblioteca
          </Link>
          <Link href="/hall-of-fame" className={isActive("salon") ? "active" : ""}>
            Salón de la Fama
          </Link>
          <Link href="/about" className={isActive("about") ? "active" : ""}>
            Acerca de
          </Link>
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        {user ? (
          <button className="btn ghost auth-btn" onClick={handleSignOut}>
            {user.name} ▾
          </button>
        ) : (
          <Link href="/auth" className="btn auth-btn">
            Iniciar Sesión
          </Link>
        )}
        <button
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menú"
        >
          ≡
        </button>
      </nav>

      <div
        className={"av-mobile-backdrop" + (open ? " open" : "")}
        onClick={close}
      ></div>
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div className="pixel neon-cyan" style={{ fontSize: 11, marginBottom: 16 }}>
          MENÚ
        </div>
        <Link href="/" className={isActive("home") ? "active" : ""} onClick={close}>
          Inicio
        </Link>
        <Link href="/biblioteca" className={isActive("biblioteca") ? "active" : ""} onClick={close}>
          Biblioteca
        </Link>
        <Link
          href="/hall-of-fame"
          className={isActive("salon") ? "active" : ""}
          onClick={close}
        >
          Salón de la Fama
        </Link>
        <Link href="/about" className={isActive("about") ? "active" : ""} onClick={close}>
          Acerca de
        </Link>
        <Link href="/auth" className={isActive("auth") ? "active" : ""} onClick={close}>
          {user ? "Cuenta" : "Iniciar Sesión"}
        </Link>
        <div style={{ flex: 1 }}></div>
        <div
          className="pixel"
          style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: "0.16em" }}
        >
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
