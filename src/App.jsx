import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient.js";

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("MENYAMBUNGKAN DATABASE...");

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        let session = sessionData.session;

        if (!session) {
          const { data, error } = await supabase.auth.signInAnonymously();
          if (error) throw error;
          session = data.session;
        }

        if (!session?.user) throw new Error("Sesi anonymous tidak tersedia.");

        const { data: todoData, error: todoError } = await supabase
          .from("todos")
          .select("id,title,completed,created_at")
          .order("created_at", { ascending: false });

        if (todoError) throw todoError;
        if (!active) return;

        setUser(session.user);
        setTasks(todoData ?? []);
        setMessage("TERHUBUNG KE SUPABASE");
      } catch (error) {
        if (active) setMessage(`DATABASE ERROR: ${error.message}`);
      } finally {
        if (active) setLoading(false);
      }
    }

    initialize();
    return () => { active = false; };
  }, []);

  const visibleTasks = useMemo(() => {
    if (filter === "active") return tasks.filter((task) => !task.completed);
    if (filter === "done") return tasks.filter((task) => task.completed);
    return tasks;
  }, [filter, tasks]);

  const completedCount = tasks.filter((task) => task.completed).length;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  async function addTask(event) {
    event.preventDefault();
    const title = draft.trim();
    if (!title || !user) return;

    const { data, error } = await supabase
      .from("todos")
      .insert({ title, user_id: user.id })
      .select("id,title,completed,created_at")
      .single();

    if (error) return setMessage(`GAGAL MENAMBAH: ${error.message}`);
    setTasks([data, ...tasks]);
    setDraft("");
    setMessage("TODO TERSIMPAN");
  }

  async function toggleTask(id) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;

    const { data, error } = await supabase
      .from("todos")
      .update({ completed: !task.completed })
      .eq("id", id)
      .select("id,title,completed,created_at")
      .single();

    if (error) return setMessage(`GAGAL MEMPERBARUI: ${error.message}`);
    setTasks(tasks.map((item) => (item.id === id ? data : item)));
  }

  async function removeTask(id) {
    const { error } = await supabase.from("todos").delete().eq("id", id);
    if (error) return setMessage(`GAGAL MENGHAPUS: ${error.message}`);
    setTasks(tasks.filter((task) => task.id !== id));
  }

  function beginEdit(task) {
    setEditingId(task.id);
    setEditingText(task.title);
  }

  async function saveEdit(id) {
    const title = editingText.trim();
    if (title) {
      const { data, error } = await supabase
        .from("todos")
        .update({ title })
        .eq("id", id)
        .select("id,title,completed,created_at")
        .single();

      if (error) return setMessage(`GAGAL MEMPERBARUI: ${error.message}`);
      setTasks(tasks.map((task) => (task.id === id ? data : task)));
    }
    setEditingId(null);
  }

  async function clearCompleted() {
    const { error } = await supabase.from("todos").delete().eq("completed", true);
    if (error) return setMessage(`GAGAL MEMBERSIHKAN: ${error.message}`);
    setTasks(tasks.filter((task) => !task.completed));
  }

  return (
    <main className="page-shell">
      <section className="app-window">
        <header className="hero">
          <div>
            <p className="eyebrow">PRASTECH PRODUCTIVITY LAB</p>
            <h1>Prast<span>Todo</span></h1>
            <p className="tagline">Selesaikan yang penting. Sisanya nanti.</p>
          </div>
          <div className="stamp" aria-label="Status aplikasi aktif">
            <strong>ON</strong>
            <small>TRACK</small>
          </div>
        </header>

        <section className="dashboard">
          <div className="stat-block">
            <span>PROGRESS HARI INI</span>
            <strong>{progress}%</strong>
          </div>
          <div className="progress-track" aria-label={`Progress ${progress}%`}>
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p>{completedCount} dari {tasks.length} tugas sudah selesai</p>
        </section>

        <form className="add-form" onSubmit={addTask}>
          <label htmlFor="task-input">TUGAS BARU</label>
          <div className="input-row">
            <input
              id="task-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Apa yang mau dibereskan?"
              autoComplete="off"
            />
            <button type="submit" className="primary-button" disabled={loading || !user}>TAMBAH +</button>
          </div>
        </form>

        <nav className="filter-row" aria-label="Filter tugas">
          {[
            ["all", "SEMUA"],
            ["active", "AKTIF"],
            ["done", "SELESAI"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={filter === value ? "filter active" : "filter"}
              onClick={() => setFilter(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </nav>

        <section className="task-list" aria-live="polite">
          {loading ? (
            <div className="empty-state">
              <strong>MEMUAT...</strong>
              <p>Mengambil Todo dari Supabase.</p>
            </div>
          ) : visibleTasks.length === 0 ? (
            <div className="empty-state">
              <strong>BERSIH!</strong>
              <p>Belum ada tugas di kategori ini.</p>
            </div>
          ) : visibleTasks.map((task) => (
            <article className={task.completed ? "task-card completed" : "task-card"} key={task.id}>
              <button
                className="check-button"
                type="button"
                aria-label={task.completed ? "Tandai belum selesai" : "Tandai selesai"}
                onClick={() => toggleTask(task.id)}
              >
                {task.completed ? "✓" : ""}
              </button>

              {editingId === task.id ? (
                <input
                  className="edit-input"
                  value={editingText}
                  onChange={(event) => setEditingText(event.target.value)}
                  onBlur={() => saveEdit(task.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") saveEdit(task.id);
                    if (event.key === "Escape") setEditingId(null);
                  }}
                  autoFocus
                />
              ) : (
                <p>{task.title}</p>
              )}

              <div className="task-actions">
                <button type="button" onClick={() => beginEdit(task)} aria-label="Edit tugas">EDIT</button>
                <button type="button" onClick={() => removeTask(task.id)} aria-label="Hapus tugas">HAPUS</button>
              </div>
            </article>
          ))}
        </section>

        <footer>
          <p>{message}</p>
          <button type="button" onClick={clearCompleted} disabled={!completedCount}>
            BERSIHKAN SELESAI
          </button>
        </footer>
      </section>
    </main>
  );
}
