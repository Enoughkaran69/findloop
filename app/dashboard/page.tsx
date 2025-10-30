"use client";
import { useEffect, useState } from "react";
import { auth, logout } from "../../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Only redirect after we've resolved the auth state and there's no user
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="splash-root">
        <div className="splash-card">
          <div className="app-icon" aria-hidden>
            FL
          </div>
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  // TypeScript can't infer that `user` is non-null here, so guard again.
  if (!user) return null;

  return (
    <div className="dashboard">
      <h2>You're signed in</h2>
      {user.photoURL && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.photoURL} alt={user.displayName || "avatar"} className="avatar" />
      )}
      <p>{user.displayName}</p>
      <p>{user.email}</p>
      <div style={{ marginTop: 18 }}>
        <button onClick={async () => { await logout(); router.replace('/'); }} className="google-btn">
          Logout
        </button>
      </div>
    </div>
  );
}
