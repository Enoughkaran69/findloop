"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { ref, onValue, push } from "firebase/database";

interface Msg {
  id: string;
  from: string;
  text: string;
  createdAt: number;
}

export default function ChatPage() {
  const params = useParams();
  const otherUid = params?.uid as string | undefined;
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const [otherProfile, setOtherProfile] = useState<any | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user || !otherUid) return;
    const convId = user.uid < otherUid ? `${user.uid}_${otherUid}` : `${otherUid}_${user.uid}`;
    const mRef = ref(db, `messages/${convId}`);
    const unsub = onValue(mRef, (snap) => {
      const val = snap.val() || {};
      const arr = Object.entries(val).map(([k, v]: any) => ({ id: k, ...v })) as Msg[];
      arr.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setMessages(arr);
    });
    return () => unsub();
  }, [user, otherUid]);

  useEffect(() => {
    if (!otherUid) return;
    const pRef = ref(db, `profiles/${otherUid}`);
    const unsub = onValue(pRef, (snap) => setOtherProfile(snap.val()));
    return () => unsub();
  }, [otherUid]);

  const send = async () => {
    if (!text.trim() || !user || !otherUid) return;
    const convId = user.uid < otherUid ? `${user.uid}_${otherUid}` : `${otherUid}_${user.uid}`;
    await push(ref(db, `messages/${convId}`), {
      from: user.uid,
      text: text.trim(),
      createdAt: Date.now(),
    });
    setText("");
  };

  return (
    <div className="chat-page">
      <header className="chat-header">
        <button className="back-btn" onClick={() => router.back()}>
          ← Back
        </button>
        <div className="chat-title">{otherProfile?.displayName || otherUid}</div>
      </header>

      <main className="chat-main">
        <div className="messages-list">
          {messages.map((m) => (
            <div key={m.id} className={`msg ${m.from === user?.uid ? "me" : "them"}`}>
              <div className="msg-text">{m.text}</div>
              <div className="msg-meta">{new Date(m.createdAt).toLocaleTimeString()}</div>
            </div>
          ))}
        </div>
      </main>

      <footer className="chat-input">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          placeholder="Send a message..."
        />
        <button onClick={send}>Send</button>
      </footer>
    </div>
  );
}
