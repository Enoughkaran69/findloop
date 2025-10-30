"use client";
import React, { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { ref, onValue, set, remove } from "firebase/database";
import "@/styles/find.css";

interface Profile {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
  online?: boolean;
}

export default function FindPeoplePage() {
  const [user, setUser] = useState<User | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [incoming, setIncoming] = useState<Record<string, any>>({});
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [incomingLoading, setIncomingLoading] = useState(true);
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [connections, setConnections] = useState<Record<string, boolean>>({});
  const [sentRequests, setSentRequests] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  // listen to profiles list
  useEffect(() => {
    const pRef = ref(db, "profiles");
    const unsubscribe = onValue(pRef, (snap) => {
      const val = snap.val() || {};
      const arr: Profile[] = Object.keys(val || {}).map((k) => val[k]);
      setProfiles(arr);
      setProfilesLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // listen to my connections
  useEffect(() => {
    if (!user) {
      setConnections({});
      return;
    }
    const cRef = ref(db, `connections/${user.uid}`);
    const unsub = onValue(cRef, (snap) => {
      const val = snap.val() || {};
      const map: Record<string, boolean> = {};
      Object.keys(val || {}).forEach((k) => (map[k] = true));
      setConnections(map);
    });
    return () => unsub();
  }, [user]);

  // listen to my sent requests (so sender sees Requested state)
  useEffect(() => {
    if (!user) {
      setSentRequests({});
      return;
    }
    const sRef = ref(db, `sentRequests/${user.uid}`);
    const unsub = onValue(sRef, (snap) => {
      const val = snap.val() || {};
      const map: Record<string, boolean> = {};
      Object.keys(val || {}).forEach((k) => (map[k] = true));
      setSentRequests(map);
    });
    return () => unsub();
  }, [user]);

  // listen to incoming requests for current user
  useEffect(() => {
    setIncomingLoading(true);
    if (!user) {
      setIncoming({});
      setIncomingLoading(false);
      return;
    }
    const rRef = ref(db, `requests/${user.uid}`);
    const unsub = onValue(rRef, (snap) => {
      const val = snap.val() || {};
      setIncoming(val);
      setIncomingLoading(false);
    });
    return () => unsub();
  }, [user]);

  const sendRequest = async (target: Profile) => {
    if (!user) return;
    setSending((s) => ({ ...s, [target.uid]: true }));
    try {
      const reqRef = ref(db, `requests/${target.uid}/${user.uid}`);
      await set(reqRef, {
        fromUid: user.uid,
        fromName: user.displayName || user.email || "Anonymous",
        fromPhoto: user.photoURL || null,
        timestamp: new Date().toISOString(),
        status: "pending",
      });
      // mark as sent for UI convenience
      await set(ref(db, `sentRequests/${user.uid}/${target.uid}`), true);
    } catch (e) {
      console.error(e);
    } finally {
      setSending((s) => ({ ...s, [target.uid]: false }));
    }
  };

  const acceptRequest = async (fromUid: string) => {
    if (!user) return;
    setProcessing((s) => ({ ...s, [fromUid]: true }));
    try {
      // create mutual connection entries
      await set(ref(db, `connections/${user.uid}/${fromUid}`), true);
      await set(ref(db, `connections/${fromUid}/${user.uid}`), true);
      // remove request
      await remove(ref(db, `requests/${user.uid}/${fromUid}`));
      // cleanup sender's sentRequests entry
      await remove(ref(db, `sentRequests/${fromUid}/${user.uid}`));
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing((s) => ({ ...s, [fromUid]: false }));
    }
  };

  const rejectRequest = async (fromUid: string) => {
    if (!user) return;
    setProcessing((s) => ({ ...s, [fromUid]: true }));
    try {
      await remove(ref(db, `requests/${user.uid}/${fromUid}`));
      // cleanup sender's sentRequests entry
      await remove(ref(db, `sentRequests/${fromUid}/${user.uid}`));
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing((s) => ({ ...s, [fromUid]: false }));
    }
  };

  const removeConnection = async (targetUid: string) => {
    if (!user) return;
    setProcessing((s) => ({ ...s, [targetUid]: true }));
    try {
      await remove(ref(db, `connections/${user.uid}/${targetUid}`));
      await remove(ref(db, `connections/${targetUid}/${user.uid}`));
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing((s) => ({ ...s, [targetUid]: false }));
    }
  };

  const alreadyRequested = (targetUid: string) => {
    // Check local sending state or persisted sentRequests
    return !!sending[targetUid] || !!sentRequests[targetUid];
  };

  const loading = profilesLoading || (user ? incomingLoading : false);

  return (
    <div className="find-page">
      <h2>Find People</h2>
      <div className="background-gradient"></div>

      {/* Loading indicator while Firebase data arrives */}
      {loading && (
        <div className="loading-block">
          <div className="loading-bar">
            <div className="loading-progress" />
          </div>
          <p>Looking for amazing people...</p>
        </div>
      )}

      {/* Incoming requests - show at top */}
      {user && Object.keys(incoming).length > 0 && (
        <section className="incoming-requests">
          <h3>Incoming Requests</h3>
          {Object.keys(incoming).map((fromUid) => {
            const r = incoming[fromUid];
            return (
              <div key={fromUid} className="request-row">
                <div className="request-info">
                  <div className="avatar-small">
                    {r.fromPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.fromPhoto} alt={r.fromName} />
                    ) : (
                      <div className="avatar-placeholder">{(r.fromName || "?").charAt(0)}</div>
                    )}
                  </div>
                  <div className="request-meta">
                    <strong>{r.fromName}</strong>
                    <div className="small">wants to connect</div>
                  </div>
                </div>
                <div className="request-actions">
                  <button onClick={() => acceptRequest(fromUid)} className="accept">Accept</button>
                  <button onClick={() => rejectRequest(fromUid)} className="reject">Reject</button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="people-list">
        {profiles
          .filter((p) => !user || p.uid !== user.uid)
          .map((p) => {
            const hasIncoming = !!incoming[p.uid];
            const isConnected = !!connections[p.uid];
            const isSent = !!sentRequests[p.uid] || !!sending[p.uid];
            return (
              <div key={p.uid} className="person-row">
                <div className="person-info">
                  {p.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.photoURL} alt={p.displayName || p.email || "user"} className="avatar" />
                  ) : (
                    <div className="avatar-placeholder">{(p.displayName || p.email || "?").charAt(0)}</div>
                  )}
                  <div>
                    <div className="name">{p.displayName || p.email || "No name"}</div>
                    <div className="small">{p.online ? "Online" : "Offline"}</div>
                  </div>
                </div>
                <div>
                  {isConnected ? (
                    <button
                      className="remove-btn"
                      onClick={() => removeConnection(p.uid)}
                      disabled={processing[p.uid]}
                    >
                      {processing[p.uid] ? "Removing..." : "Remove"}
                    </button>
                  ) : hasIncoming ? (
                    <div className="inline-requests">
                      <button
                        className="accept"
                        onClick={() => acceptRequest(p.uid)}
                        disabled={processing[p.uid]}
                      >
                        {processing[p.uid] ? "Accepting..." : "Accept"}
                      </button>
                      <button
                        className="reject"
                        onClick={() => rejectRequest(p.uid)}
                        disabled={processing[p.uid]}
                      >
                        {processing[p.uid] ? "..." : "Reject"}
                      </button>
                    </div>
                  ) : isSent ? (
                    <button className="requested" disabled>
                      Requested
                    </button>
                  ) : (
                    <button
                      className="connect-btn"
                      onClick={() => sendRequest(p)}
                      disabled={alreadyRequested(p.uid)}
                    >
                      {alreadyRequested(p.uid) ? "Requested" : "Connect"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
      </section>
    </div>
  );
}
