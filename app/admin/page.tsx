"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  Download,
  LogOut,
  PackageCheck,
  Save,
  Search,
  ShieldCheck,
  Ticket,
  Users,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";

type Content = Record<string, unknown>;
type Order = {
  order_id: string;
  attendee_name: string;
  attendee_email: string;
  attendee_whatsapp: string;
  quantity: number;
  payment_status: string;
  checkin_status: string;
  souvenir_status: string;
  ticket_code: string;
  created_at: string;
};
type PaidOrder = {
  order_id: string;
  attendee_name: string;
  attendee_email: string;
  attendee_whatsapp: string;
  quantity: number;
  payment_amount: number | null;
  unit_price: number;
  order_total: number;
  created_at: string;
};
type Dashboard = {
  role: "admin" | "operator";
  summary: {
    tickets?: number;
    checked_in?: number;
    souvenirs?: number;
    paid?: number;
    orders?: number;
  };
  orders: Order[];
  paidOrders: PaidOrder[];
};

function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function csvCell(value: string | number) {
  const text = String(value);
  const safeText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

const editableFields = [
  ["eventName", "Nama acara"],
  ["heroTitle", "Judul hero"],
  ["heroDescription", "Deskripsi hero"],
  ["aboutTitle", "Judul tentang"],
  ["aboutDescription", "Deskripsi tentang"],
  ["date", "Tanggal"],
  ["time", "Waktu"],
  ["venue", "Lokasi singkat"],
  ["address", "Alamat lengkap"],
  ["ticketPrice", "Harga tiket"],
  ["instagram", "Instagram"],
] as const;

export default function AdminPage() {
  const [content, setContent] = useState<Content | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [tab, setTab] = useState<
    "overview" | "content" | "orders" | "paid-report"
  >("overview");
  const [query, setQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [accessRequired, setAccessRequired] = useState(false);
  const [password, setPassword] = useState("");

  async function load() {
    setError("");
    try {
      const [contentResponse, statsResponse] = await Promise.all([
        fetch("/api/admin/content"),
        fetch("/api/admin/stats"),
      ]);
      if (contentResponse.status === 401 || statsResponse.status === 401) {
        setAccessRequired(true);
        return;
      }
      setAccessRequired(false);
      if (!contentResponse.ok || !statsResponse.ok)
        throw new Error("Gagal memuat data dashboard");
      const contentData = await contentResponse.json();
      const statsData = await statsResponse.json();
      setContent(contentData.content ?? contentData);
      setDashboard(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat dashboard");
    }
  }
  useEffect(() => {
    void load();
  }, []);
  const filteredOrders = useMemo(
    () =>
      dashboard?.orders.filter(
        (order) =>
          (paymentFilter === "all" || order.payment_status === paymentFilter) &&
          [
            order.order_id,
            order.attendee_name,
            order.attendee_email,
            order.attendee_whatsapp,
            order.ticket_code,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase()),
      ) ?? [],
    [dashboard, paymentFilter, query],
  );
  const filteredPaidOrders = useMemo(
    () =>
      dashboard?.paidOrders.filter((order) =>
        [
          order.order_id,
          order.attendee_name,
          order.attendee_email,
          order.attendee_whatsapp,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase()),
      ) ?? [],
    [dashboard, query],
  );
  const update = (key: string, value: string) =>
    setContent((current) =>
      current
        ? {
            ...current,
            [key]:
              key === "ticketPrice" ? Number(value.replace(/\D/g, "")) : value,
          }
        : current,
    );
  async function unlockDashboard(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("unlock");
    setError("");
    const response = await fetch("/api/checkin/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await response.json();
    setBusy("");
    if (!response.ok) {
      setError(data.error ?? "Password sementara salah.");
      return;
    }
    setPassword("");
    await load();
  }

  async function saveContent() {
    if (!content || dashboard?.role !== "admin") return;
    setBusy("save");
    setMessage("");
    setError("");
    const response = await fetch("/api/admin/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(content),
    });
    const data = await response.json();
    setBusy("");
    if (!response.ok) setError(data.error ?? "Gagal menyimpan konten");
    else {
      setContent(data);
      setMessage("Konten berhasil disimpan.");
    }
  }
  async function operationalAction(
    action: "checkin" | "souvenir",
    ticketCode: string,
  ) {
    setBusy(ticketCode + action);
    setMessage("");
    const endpoint = action === "checkin" ? "/api/checkin" : "/api/souvenir";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketCode }),
    });
    const data = await response.json();
    setBusy("");
    if (!response.ok) setError(data.error ?? "Aksi gagal");
    else {
      setMessage(data.message ?? "Aksi berhasil");
      await load();
    }
  }
  function exportCsv() {
    const header = [
      "order_id",
      "ticket_code",
      "attendee_name",
      "attendee_email",
      "payment_status",
      "checkin_status",
      "souvenir_status",
      "created_at",
    ];
    const rows = filteredOrders.map((order) =>
      header
        .map((key) => JSON.stringify(order[key as keyof Order] ?? ""))
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...rows].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "dwipantara-tiket.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }
  function exportPaidCsv() {
    const header = [
      "ID Order",
      "Nama pembeli",
      "WhatsApp",
      "Email",
      "Jumlah tiket",
      "Nominal pembayaran terkonfirmasi (Rp)",
      "Harga satuan rata-rata (Rp)",
      "Total tiket (Rp)",
    ];
    const rows = filteredPaidOrders.map((order) =>
      [
        order.order_id,
        order.attendee_name,
        order.attendee_whatsapp,
        order.attendee_email,
        order.quantity,
        order.payment_amount ?? "",
        order.unit_price.toFixed(2),
        order.order_total,
      ]
        .map(csvCell)
        .join(","),
    );
    const blob = new Blob(
      [[header.map(csvCell).join(","), ...rows].join("\n")],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "dwipantara-rekap-tiket-lunas.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }
  async function syncHistoricalPayments() {
    setBusy("backfill");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/payments/backfill", {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Gagal menyinkronkan nominal order lama.");
      }
      await load();
      setMessage(
        `${data.synced} order berhasil disinkronkan. ${data.remaining} order masih belum memiliki nominal pembayaran.`,
      );
      if (data.failed?.length) {
        setError(
          `Gagal menyinkronkan: ${data.failed
            .map(
              (failure: { order_id: string; error: string }) =>
                `${failure.order_id} — ${failure.error}`,
            )
            .join("; ")}`,
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal menyinkronkan nominal order lama.",
      );
    } finally {
      setBusy("");
    }
  }
  async function signOut() {
    await authClient.signOut();
    window.location.href = "/sign-in";
  }
  if (accessRequired)
    return (
      <main className="grid min-h-screen place-items-center bg-background px-4">
        <form onSubmit={unlockDashboard} className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="eyebrow">DWIPANTARA 2026 · OPERATIONS</p>
          <h1 className="mt-2 font-serif text-3xl font-bold">Dashboard admin</h1>
          <p className="mt-2 text-sm text-muted-foreground">Masukkan password sementara untuk melihat daftar pembeli dan status tiket. Halaman check-in kiosk tetap menggunakan akses yang sama.</p>
          <label htmlFor="admin-access-password" className="mt-6 block text-sm font-bold">Password sementara</label>
          <input id="admin-access-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3" autoFocus required />
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          <button type="submit" disabled={busy === "unlock"} className="mt-5 w-full rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground disabled:opacity-50">
            {busy === "unlock" ? "Memeriksa…" : "Buka dashboard"}
          </button>
          <Link href="/" className="mt-4 block text-center text-sm font-bold text-muted-foreground">Kembali ke halaman awal</Link>
        </form>
      </main>
    );
  if (!content || !dashboard)
    return (
      <main className="grid min-h-screen place-items-center bg-background">
        <p className="text-muted-foreground">Memuat dashboard…</p>
      </main>
    );
  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-10">
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-4">
            <Link
              href="/"
              className="text-sm font-bold text-muted-foreground transition-colors hover:text-foreground"
            >
              ← Kembali ke halaman awal
            </Link>
            <Link
              href="/sign-in"
              className="text-sm font-bold text-muted-foreground transition-colors hover:text-foreground"
            >
              Login admin
            </Link>
          </div>
          <p className="eyebrow">DWIPANTARA 2026 · OPERATIONS</p>
          <h1 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">
            Dashboard {dashboard.role === "admin" ? "Admin" : "Operator"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola acara, tiket, absensi, dan souvenir dari satu tempat.
          </p>
        </div>
        <button
          onClick={signOut}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-bold"
        >
          <LogOut size={16} /> Keluar
        </button>
      </header>
      {error && (
        <p className="mx-auto mt-5 max-w-7xl rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {message && (
        <p className="mx-auto mt-5 max-w-7xl rounded-xl bg-accent/20 p-3 text-sm">
          {message}
        </p>
      )}
      <nav
        className="mx-auto mt-8 flex max-w-7xl gap-2 overflow-x-auto border-b border-border pb-2"
        aria-label="Navigasi dashboard"
      >
        {[
          ["overview", "Ringkasan"],
          ["orders", "Order & Tiket"],
          ["paid-report", "Rekap Lunas"],
          ...(dashboard.role === "admin"
            ? [["content", "Konten & Harga"]]
            : []),
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key as typeof tab)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${tab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === "overview" && (
        <section className="mx-auto mt-6 grid max-w-7xl gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["Tiket", dashboard.summary.tickets ?? 0, <Ticket />],
            ["Lunas", dashboard.summary.paid ?? 0, <ShieldCheck />],
            ["Hadir", dashboard.summary.checked_in ?? 0, <Users />],
            ["Souvenir", dashboard.summary.souvenirs ?? 0, <PackageCheck />],
            ["Order", dashboard.summary.orders ?? 0, <Check />],
          ].map(([label, value, icon]) => (
            <article
              key={String(label)}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex items-center gap-3 text-accent">
                {icon}
                <span className="text-sm text-muted-foreground">{label}</span>
              </div>
              <strong className="mt-3 block font-serif text-3xl">
                {String(value)}
              </strong>
            </article>
          ))}
        </section>
      )}
      {tab === "content" && dashboard.role === "admin" && (
        <section className="mx-auto mt-6 max-w-4xl rounded-3xl border border-border bg-card p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl font-bold">
                Konten halaman utama
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Perubahan langsung tampil di halaman publik setelah disimpan.
              </p>
            </div>
            <button
              disabled={busy === "save"}
              onClick={saveContent}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
            >
              <Save size={16} /> {busy === "save" ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {editableFields.map(([key, label]) => (
              <Field
                key={key}
                label={label}
                value={content[key]}
                textarea={key.toLowerCase().includes("description")}
                onChange={(value) => update(key, value)}
              />
            ))}
          </div>
        </section>
      )}
      {tab === "orders" && (
        <section className="mx-auto mt-6 max-w-7xl rounded-3xl border border-border bg-card p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl font-bold">Order & tiket</h2>
              <p className="text-sm text-muted-foreground">
                Gunakan kode tiket untuk check-in dan distribusi souvenir.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 rounded-full border border-border px-3">
                <Search size={16} />
                <input
                  aria-label="Cari order atau tiket"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari…"
                  className="w-32 bg-transparent py-2 text-sm outline-none sm:w-52"
                />
              </label>
              <label className="flex items-center gap-2 rounded-full border border-border px-3 text-sm font-bold">
                <span className="text-muted-foreground">Pembayaran</span>
                <select
                  aria-label="Filter status pembayaran"
                  value={paymentFilter}
                  onChange={(event) => setPaymentFilter(event.target.value)}
                  className="bg-transparent py-2 outline-none"
                >
                  <option value="all">Semua status</option>
                  <option value="paid">Lunas</option>
                  <option value="pending">Menunggu</option>
                  <option value="expired">Kedaluwarsa</option>
                  <option value="cancelled">Dibatalkan</option>
                </select>
              </label>
              <button
                onClick={exportCsv}
                className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm font-bold"
              >
                <Download size={16} /> CSV
              </button>
            </div>
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="p-3">Tiket</th>
                  <th className="p-3">Pemesan</th>
                  <th className="p-3">Pembayaran</th>
                  <th className="p-3">Absensi</th>
                  <th className="p-3">Souvenir</th>
                  <th className="p-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr
                    key={order.ticket_code}
                    className="border-b border-border/60"
                  >
                    <td className="p-3">
                      <strong>{order.ticket_code}</strong>
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {order.order_id}
                      </span>
                    </td>
                    <td className="p-3">
                      {order.attendee_name}
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {order.attendee_email}
                      </span>
                    </td>
                    <td className="p-3">{order.payment_status}</td>
                    <td className="p-3">{order.checkin_status}</td>
                    <td className="p-3">{order.souvenir_status}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        {order.checkin_status !== "checked_in" && (
                          <button
                            disabled={busy === order.ticket_code + "checkin"}
                            onClick={() =>
                              operationalAction("checkin", order.ticket_code)
                            }
                            className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                          >
                            Check-in
                          </button>
                        )}
                        {order.checkin_status === "checked_in" &&
                          order.souvenir_status !== "collected" && (
                            <button
                              disabled={busy === order.ticket_code + "souvenir"}
                              onClick={() =>
                                operationalAction("souvenir", order.ticket_code)
                              }
                              className="rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground"
                            >
                              Souvenir
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredOrders.length && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Belum ada tiket yang cocok.
              </p>
            )}
          </div>
        </section>
      )}
      {tab === "paid-report" && (
        <section className="mx-auto mt-6 max-w-7xl rounded-3xl border border-border bg-card p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl font-bold">
                Rekap tiket lunas
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Nominal bruto yang dibayar pelanggan sesuai gateway, sebelum
                potongan settlement; total harga tiket dihitung terpisah.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {filteredPaidOrders.some((order) => order.payment_amount === null) && (
                <button
                  onClick={syncHistoricalPayments}
                  disabled={busy === "backfill"}
                  className="rounded-full border border-border px-3 py-2 text-sm font-bold disabled:opacity-50"
                >
                  {busy === "backfill"
                    ? "Menyinkronkan…"
                    : "Sinkronkan nominal lama"}
                </button>
              )}
              <label className="flex items-center gap-2 rounded-full border border-border px-3">
                <Search size={16} />
                <input
                  aria-label="Cari pembeli tiket lunas"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari nama atau kontak…"
                  className="w-40 bg-transparent py-2 text-sm outline-none sm:w-56"
                />
              </label>
              <button
                onClick={exportPaidCsv}
                className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm font-bold"
              >
                <Download size={16} /> Unduh CSV
              </button>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-border p-4">
              <p className="text-sm text-muted-foreground">Order lunas</p>
              <strong className="mt-1 block font-serif text-2xl">
                {filteredPaidOrders.length}
              </strong>
            </article>
            <article className="rounded-2xl border border-border p-4">
              <p className="text-sm text-muted-foreground">Jumlah tiket</p>
              <strong className="mt-1 block font-serif text-2xl">
                {filteredPaidOrders.reduce(
                  (total, order) => total + order.quantity,
                  0,
                )}
              </strong>
            </article>
            <article className="rounded-2xl border border-border p-4">
              <p className="text-sm text-muted-foreground">
                Nominal pembayaran tercatat
              </p>
              <strong className="mt-1 block font-serif text-2xl">
                {formatRupiah(
                  filteredPaidOrders.reduce(
                    (total, order) => total + (order.payment_amount ?? 0),
                    0,
                  ),
                )}
              </strong>
              {filteredPaidOrders.some(
                (order) => order.payment_amount === null,
              ) && (
                <span className="mt-1 block text-xs text-muted-foreground">
                  Sebagian order lama belum tersinkron.
                </span>
              )}
            </article>
            <article className="rounded-2xl border border-border p-4">
              <p className="text-sm text-muted-foreground">
                Total harga tiket
              </p>
              <strong className="mt-1 block font-serif text-2xl">
                {formatRupiah(
                  filteredPaidOrders.reduce(
                    (total, order) => total + order.order_total,
                    0,
                  ),
                )}
              </strong>
            </article>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="p-3">Pembeli</th>
                  <th className="p-3">Kontak WhatsApp</th>
                  <th className="p-3">Jumlah tiket</th>
                  <th className="p-3">Nominal pembayaran</th>
                  <th className="p-3">Harga satuan rata-rata</th>
                  <th className="p-3">Total harga tiket</th>
                </tr>
              </thead>
              <tbody>
                {filteredPaidOrders.map((order) => (
                  <tr key={order.order_id} className="border-b border-border/60">
                    <td className="p-3">
                      <strong>{order.attendee_name}</strong>
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {order.attendee_email}
                      </span>
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {order.order_id}
                      </span>
                    </td>
                    <td className="p-3">{order.attendee_whatsapp}</td>
                    <td className="p-3">{order.quantity}</td>
                    <td className="p-3">
                      {order.payment_amount === null
                        ? "Belum tersinkron"
                        : formatRupiah(order.payment_amount)}
                    </td>
                    <td className="p-3">{formatRupiah(order.unit_price)}</td>
                    <td className="p-3">{formatRupiah(order.order_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredPaidOrders.length && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Belum ada tiket lunas yang cocok.
              </p>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea = false,
}: {
  label: string;
  value: unknown;
  onChange: (value: string) => void;
  textarea?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-muted-foreground">
      {label}
      {textarea ? (
        <textarea
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
          className="w-full rounded-xl border border-border bg-background p-3 font-normal text-foreground outline-none focus:ring-2 focus:ring-accent"
        />
      ) : (
        <input
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-border bg-background p-3 font-normal text-foreground outline-none focus:ring-2 focus:ring-accent"
        />
      )}
    </label>
  );
}
