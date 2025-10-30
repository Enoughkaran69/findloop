"use client";
import { useEffect, useState } from "react";
import { auth, logout, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { ref, set, onDisconnect, onValue } from "firebase/database";

interface Profile {
  uid: string;
  displayName?: string | null;
  photoURL?: string | null;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [connections, setConnections] = useState<string[]>([]);
  const [connectedProfiles, setConnectedProfiles] = useState<Record<string, Profile>>({});
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      // publish basic profile info to Realtime DB so other users can discover
      if (u) {
        const profileRef = ref(db, `profiles/${u.uid}`);
        set(profileRef, {
          uid: u.uid,
          displayName: u.displayName || null,
          email: u.email || null,
          photoURL: u.photoURL || null,
          lastSeen: new Date().toISOString(),
          online: true,
        }).catch((e) => console.error("Failed to write profile", e));

        // mark user offline when the client disconnects instead of removing the whole profile
        // this prevents the profile from being deleted on page refresh/close while still
        // signaling to others that the user is offline and recording a lastSeen timestamp.
        try {
          onDisconnect(profileRef).update({
            online: false,
            lastSeen: new Date().toISOString(),
          });
        } catch (e) {
          // onDisconnect may throw if using emulator or not supported in the environment
        }
      }
    });
    return () => unsub();
  }, []);

  // Only redirect after we've resolved the auth state and there's no user
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  // listen to my connections for the dashboard (used to show/hide messages card)
  useEffect(() => {
    if (!user) {
      setConnections([]);
      return;
    }
    const cRef = ref(db, `connections/${user.uid}`);
    const unsub = onValue(cRef, (snap) => {
      const val = snap.val() || {};
      setConnections(Object.keys(val));
    });
    return () => unsub();
  }, [user]);

  // fetch profiles for connected users so we can show names/avatars in the card
  useEffect(() => {
    if (connections.length === 0) {
      setConnectedProfiles({});
      return;
    }
    const unsubHandlers: Array<() => void> = [];
    connections.forEach((uid) => {
      const pRef = ref(db, `profiles/${uid}`);
      const unsub = onValue(pRef, (snap) => {
        const val = snap.val();
        setConnectedProfiles((s) => ({ ...s, [uid]: val }));
      });
      unsubHandlers.push(() => unsub());
    });
    return () => unsubHandlers.forEach((u) => u());
  }, [connections]);

  if (loading) {
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
          <p className="splash-subtitle">Loading your connections...</p>
          <div className="loading-bar">
            <div className="loading-progress"></div>
          </div>
        </div>
      </div>
    );
  }

  // TypeScript can't infer that `user` is non-null here, so guard again.
  if (!user) return null;

  const WelcomeCard = () => (
    <div className="welcome-card">
      <div className="avatar-section">
        <div className="avatar-wrapper">
          {user.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photoURL} alt={user.displayName || "avatar"} className="avatar" />
          ) : (
            <div className="avatar-placeholder">
              {user.displayName?.charAt(0) || user.email?.charAt(0) || '?'}
            </div>
          )}
        </div>
      </div>

      <div className="welcome-text">
        <h1 className="welcome-title">
          Welcome back, <span className="user-name">{user.displayName?.split(' ')[0] || 'Friend'}</span>!
        </h1>
        <p className="welcome-subtitle">Ready to make meaningful connections?</p>
      </div>

      <div className="user-info">
        <div className="info-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>{user.displayName || 'User'}</span>
        </div>
        <div className="info-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
          <span>{user.email}</span>
        </div>
      </div>
      <button 
        onClick={async () => { await logout(); router.replace('/'); }} 
        className="logout-btn"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
          <polyline points="16 17 21 12 16 7"></polyline>
          <line x1="21" y1="12" x2="9" y2="12"></line>
        </svg>
        Logout
      </button>
    </div>
  );

  return (
    <div className="dashboard">
      <div className="background-gradient"></div>
      <div className="floating-hearts">
        <span className="heart">❤️</span>
        <span className="heart">💕</span>
        <span className="heart">💖</span>
        <span className="heart">💗</span>
        <span className="heart">💓</span>
        <span className="heart">🌸</span>
      </div>

      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="logo-section-small">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
                    fill="url(#headerGradient)" />
              <defs>
                <linearGradient id="headerGradient" x1="2" y1="3" x2="22" y2="21">
                  <stop offset="0%" stopColor="#ff6b9d" />
                  <stop offset="100%" stopColor="#c06c84" />
                </linearGradient>
              </defs>
            </svg>
            <span className="logo-text">Findloop</span>
          </div>
          
          <img
            src={user.photoURL || ''}
            alt={user.displayName || "avatar"}
            className="avatar-2"
            onClick={() => setShowWelcomeModal(true)}
            role="button"
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="dashboard-container">
          
          {/* Welcome Card is now available as a floating modal via avatar (top-right) */}
          

          {/* Action Cards Grid */}
          <div className="action-cards-grid">

            {/* Direct Messages Card - only show if user has connections */}
            {connections.length > 0 && (
              <div className="action-card messages-card">
                <div className="card-icon-wrapper">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    <path d="M8 10h.01M12 10h.01M16 10h.01"></path>
                  </svg>
                </div>
                <h2 className="card-title">Direct Messages</h2>
                <p className="card-description">Your {connections.length} Friends</p>

                <div className="connections-preview">
                  {connections.slice(0, 6).map((uid) => {
                    const p = connectedProfiles[uid];
                    return (
                      <div key={uid} className="connection-preview-row">
                        <div className="person-info small">
                          {p?.photoURL ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.photoURL} alt={p.displayName || uid} className="avatar" />
                          ) : (
                            <div className="avatar-placeholder">{(p?.displayName || "?").charAt(0)}</div>
                          )}
                          <div>
                            <div className="name">{p?.displayName || "No name"}</div>
                            
                          </div>
                        </div>
                        <div>
                          
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: 12 }}>
                  
                </div>
                <div className="card-decoration card-dec-2"></div>
              </div>
            )}

            {/* Find People Card */}
            <div className="action-card find-people-card">
              <div className="card-icon-wrapper">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                  <path d="M11 8a3 3 0 0 0-3 3"></path>
                </svg>
              </div>
              <h2 className="card-title">Find People</h2>
              <p className="card-description">Discover and connect with people who share your interests</p>
              <button 
                onClick={() => router.push('/find')}
                className="action-btn primary-btn"
              >
                <span>Start Exploring</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>
              <div className="card-decoration card-dec-1"></div>
            </div>

          </div>

          
        </div>
      </main>

      {/* Floating modal for welcome card */}
      {showWelcomeModal && (
        <div className="modal-overlay" onClick={() => setShowWelcomeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowWelcomeModal(false)}>×</button>
            <WelcomeCard />
          </div>
        </div>
      )}
    </div>
  );
}
