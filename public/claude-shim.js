// claude-shim.js
// Gör att Initiativtavlan fungerar utanför claude.ai utan att sidans kod skrivs om.
// Sidan anropar window.claude.use("db" | "user" | "sample"). Här implementeras samma
// gränssnitt ovanpå Supabase (databas + inloggning) och en Netlify-funktion (Claude-sammanfattning).
//
// Datamodell: en tabell `docs` (collection, id, data jsonb). Varje "samling" i sidan
// (events, news, board, ...) är rader med samma collection-värde.

(function () {
  const cfg = window.IT_CONFIG || {};
  if (!window.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
    console.error("Initiativtavlan: Supabase-konfiguration saknas (config.js).");
    return;
  }
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  // ---------- inloggning ----------
  let session = null;
  const ready = sb.auth.getSession().then(({ data }) => { session = data.session; });
  sb.auth.onAuthStateChange((_e, s) => { session = s; });

  const auth = {
    ready,
    isAuthed: () => !!session,
    email: () => session?.user?.email || "",
    // Gemensamt lösenord: loggar in på det delade kontot (SHARED_LOGIN_EMAIL).
    // Lösenordet finns inte i sidans kod – Supabase kontrollerar det.
    signInPassword: async (password) => {
      const res = await sb.auth.signInWithPassword({ email: cfg.SHARED_LOGIN_EMAIL, password });
      if (!res.error && res.data?.session) session = res.data.session;
      return res;
    },
    signOut: () => sb.auth.signOut(),
  };

  // ---------- db: samma API som claude.use("db") ----------
  function snapOf(rows) {
    return { docs: rows.map(r => ({ id: r.id, data: () => r.data })) };
  }
  async function fetchCollection(name) {
    const { data, error } = await sb.from("docs").select("id,data").eq("collection", name).order("created_at");
    if (error) throw error;
    return data;
  }
  const watchers = {}; // collection -> Set<{cb, err}>
  let channel = null;
  function ensureChannel() {
    if (channel) return;
    channel = sb.channel("docs-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "docs" }, payload => {
        const name = payload.new?.collection || payload.old?.collection;
        if (name) refresh(name);
        else Object.keys(watchers).forEach(refresh); // DELETE utan full rad: läs om allt
      })
      .subscribe();
  }
  const pending = {};
  function refresh(name) {
    if (!watchers[name] || pending[name]) return;
    pending[name] = setTimeout(async () => {
      pending[name] = null;
      try {
        const rows = await fetchCollection(name);
        watchers[name].forEach(w => w.cb(snapOf(rows)));
      } catch (e) { watchers[name].forEach(w => w.err && w.err(e)); }
    }, 150);
  }
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

  const db = {
    collection(name) {
      return {
        onSnapshot(cb, err) {
          (watchers[name] ||= new Set()).add({ cb, err });
          ensureChannel();
          fetchCollection(name).then(rows => cb(snapOf(rows))).catch(e => err && err(e));
          return () => watchers[name].forEach(w => w.cb === cb && watchers[name].delete(w));
        },
        async add(obj) {
          const id = uuid();
          const { error } = await sb.from("docs").insert({ collection: name, id, data: obj });
          if (error) throw error;
          refresh(name);
          return { id };
        },
      };
    },
    doc(path) {
      const [name, id] = String(path).split("/");
      return {
        async set(obj) {
          const { error } = await sb.from("docs").upsert({ collection: name, id, data: obj });
          if (error) throw error;
          refresh(name);
        },
        async update(patch) {
          const { error } = await sb.rpc("docs_merge", { p_collection: name, p_id: id, p_patch: patch });
          if (error) throw error;
          refresh(name);
        },
        async delete() {
          const { error } = await sb.from("docs").delete().eq("collection", name).eq("id", id);
          if (error) throw error;
          refresh(name);
        },
      };
    },
  };

  // ---------- user ----------
  const user = { id: async () => session?.user?.id || null, email: async () => session?.user?.email || null };

  // ---------- sample: Claude-sammanfattning via Netlify-funktion ----------
  const sample = {
    async json(prompt, opts = {}) {
      let res;
      try {
        res = await fetch("/api/sample", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + (session?.access_token || "") },
          body: JSON.stringify({ prompt }),
          signal: opts.signal,
        });
      } catch (e) {
        if (e.name === "AbortError") throw { code: "cancelled" };
        throw { code: "network" };
      }
      if (res.status === 429) throw { code: "rate_limited" };
      if (res.status === 401 || res.status === 403 || res.status === 501) throw { code: "not_granted" };
      if (!res.ok) throw { code: "error" };
      const body = await res.json().catch(() => null);
      if (!body || typeof body.result !== "object") throw { code: "invalid_json" };
      return body.result;
    },
  };

  window.IT = { auth, sb };
  window.claude = {
    use(cap) {
      if (!session) return Promise.reject({ code: "not_authed" });
      if (cap === "db") return Promise.resolve(db);
      if (cap === "user") return Promise.resolve(user);
      if (cap === "sample") return cfg.AI_ENABLED ? Promise.resolve(sample) : Promise.reject({ code: "not_granted" });
      return Promise.reject({ code: "unknown_capability" });
    },
  };
})();
