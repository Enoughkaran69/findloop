"use client";
import { useEffect, useState } from "react";
import { auth, googleLogin } from "../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      // Keep splash visible for a short moment so animation is visible
      setTimeout(() => setChecking(false), 700);

      // If already logged in, redirect to /dashboard after a brief moment
      if (currentUser) {
        setTimeout(() => router.replace("/dashboard"), 850);
      }
    });
    return () => unsub();
  }, [router]);

  const handleLogin = async () => {
    try {
      await googleLogin();
      router.replace("/dashboard");
    } catch (err) {
      console.error("Login failed", err);
      // keep user on login UI
    }
  };

  if (checking) {
    return (
      <div className="splash-root">
        <div className="floating-hearts">
          <span className="heart">❤️</span>
          <span className="heart">💕</span>
          <span className="heart">💖</span>
          <span className="heart">💗</span>
          <span className="heart">💓</span>
        </div>
        <div className="splash-card">
          <div className="app-icon-wrapper">
            <div className="icon-glow"></div>
            <div className="app-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
                      fill="url(#gradient)" />
                <defs>
                  <linearGradient id="gradient" x1="2" y1="3" x2="22" y2="21">
                    <stop offset="0%" stopColor="#ff6b9d" />
                    <stop offset="100%" stopColor="#c06c84" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
          <h2 className="splash-title">Welcome to Findloop</h2>
          <p className="splash-subtitle">Where hearts connect</p>
          <div className="loading-bar">
            <div className="loading-progress"></div>
          </div>
        </div>
      </div>
    );
  }

  // Not checking and no user -> show login UI
  if (!user) {
    return (
      <div className="login-page">
        <div className="background-gradient"></div>
        <div className="floating-hearts">
          <span className="heart">❤️</span>
          <span className="heart">💕</span>
          <span className="heart">💖</span>
          <span className="heart">💗</span>
          <span className="heart">💓</span>
          <span className="heart">🌸</span>
        </div>
        
        <div className="login-container">
          <div className="login-card">
            <div className="card-decoration top-left"></div>
            <div className="card-decoration bottom-right"></div>
            
            <div className="logo-section">
              <div className="couple-icon">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
                        fill="url(#loginGradient)" />
                  <defs>
                    <linearGradient id="loginGradient" x1="2" y1="3" x2="22" y2="21">
                      <stop offset="0%" stopColor="#ff6b9d" />
                      <stop offset="100%" stopColor="#c06c84" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h1 className="brand-name">Findloop</h1>
              <p className="brand-tagline">Your journey together starts here</p>
            </div>

            <div className="divider">
              <span className="divider-text">Continue with</span>
            </div>

            <button onClick={handleLogin} className="google-btn">
              <span className="btn-icon">
                <svg width="20" height="20" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#4285f4" d="M533.5 278.4c0-18.5-1.6-36.4-4.7-53.8H272v101.8h146.9c-6.3 34.2-25.9 63.2-55.2 82.7v68h89.1c52.2-48 82.7-119 82.7-198.7z"/>
                  <path fill="#34a853" d="M272 544.3c74 0 135.9-24.6 181.2-66.7l-89.1-68c-25 17-56.8 27-92.1 27-70.7 0-130.6-47.7-152-111.7h-90.3v70.3C77.1 485.9 167.6 544.3 272 544.3z"/>
                  <path fill="#fbbc04" d="M120 325.9c-10.6-31.6-10.6-65.7 0-97.3V158.3h-90.3C3.8 209.7 0 239.1 0 272s3.8 62.3 29.7 113.7L120 325.9z"/>
                  <path fill="#ea4335" d="M272 107.7c39.9 0 75.9 13.7 104.2 40.6l78.1-78.1C410.6 24.2 347.9 0 272 0 167.6 0 77.1 58.4 29.7 144.9l90.3 70.3C141.4 155.4 201.3 107.7 272 107.7z"/>
                </svg>
              </span>
              <span className="btn-text">Sign in with Google</span>
              <span className="btn-shine"></span>
            </button>

            <p className="login-footer">
              By signing in, you agree to our <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If user exists we already redirected; render nothing to avoid flicker
  return null;
}