"use client";
import React, { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { ref, onValue } from "firebase/database";

interface Profile {
  uid: string;
  displayName?: string | null;
  photoURL?: string | null;
}

export default function MessagesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [connections, setConnections] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const cRef = ref(db, `connections/${user.uid}`);
    const unsub = onValue(cRef, (snap) => {
      const val = snap.val() || {};
      setConnections(Object.keys(val));
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    // fetch profiles for connections
    if (connections.length === 0) return;
    const unsubHandlers: Array<() => void> = [];
    connections.forEach((uid) => {
      const pRef = ref(db, `profiles/${uid}`);
      const unsub = onValue(pRef, (snap) => {
        const val = snap.val();
        setProfiles((s) => ({ ...s, [uid]: val }));
      });
      unsubHandlers.push(() => unsub());
    });
    return () => unsubHandlers.forEach((u) => u());
  }, [connections]);

  if (!user) return <div className="messages-page">Please sign in to see your messages.</div>;

  return (
    <div className="messages-page">
      <h2>Your Connections</h2>
      {connections.length === 0 && <p>No connections yet — find people to connect.</p>}
      <ul className="connections-list">
        {connections.map((uid) => {
          const p = profiles[uid];
          return (
            <li key={uid} className="connection-row">
              <div className="person-info">
                {p?.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photoURL} alt={p.displayName || uid} className="avatar" />
                ) : (
                  <div className="avatar-placeholder">{(p?.displayName || "?").charAt(0)}</div>
                )}
                <div>
                  <div className="name">{p?.displayName || "No name"}</div>
                  <div className="small">{p?.uid}</div>
                </div>
              </div>
              <div>
                <button className="open-chat">Open</button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
