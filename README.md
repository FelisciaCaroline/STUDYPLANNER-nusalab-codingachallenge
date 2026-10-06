# Study Planner

A calm, café-themed study planner built with Next.js 16, Prisma, and SQLite. Aplikasi ini dirancang untuk membantu mengelola jadwal belajar, melacak tugas, mengekstrak materi dari dokumen, membuat kuis otomatis, serta berdiskusi dengan asisten belajar berbasis konteks materi.

---

## Prerequisites

Sebelum menjalankan aplikasi, pastikan perangkat telah terpasang:

* Node.js versi 18.0 atau yang lebih baru.
* Package manager (npm, pnpm, atau yarn).
* SQLite (terintegrasi langsung, tidak memerlukan setup server database eksternal).
* API Key aktif dari salah satu penyedia AI berikut:
* Google Gemini API Key
* OpenAI API Key
* Anthropic API Key


* Tavily API Key (opsional, hanya jika fitur pencarian web pada chat ingin diaktifkan).

---

## Cara Menjalankan Aplikasi

### 1. Instalasi Dependensi

Jalankan perintah berikut pada direktori utama proyek:

```bash
npm install

```

### 2. Konfigurasi Environment Variables

Duplikasi file `.env.example` menjadi `.env.local`:

```bash
cp .env.example .env.local

```

Buka file `.env.local` dan atur variabel berikut:

```env
DATABASE_URL="file:./dev.db"

# AI Configuration
LLM_PROVIDER=gemini
AI_API_KEY=your_api_key_here
AI_MODEL=gemini-1.5-flash
AI_QUIZ_MODEL=

# Web Search
ENABLE_WEB_SEARCH=false
TAVILY_API_KEY=

# Upload Configuration
MAX_UPLOAD_SIZE_MB=500

```

Catatan: Pilihan `LLM_PROVIDER` harus sesuai dengan kunci API yang digunakan:

* Key OpenAI (diawali `sk-`) menggunakan `LLM_PROVIDER=openai`.
* Key Gemini (diawali `AIza` atau `AQ`) menggunakan `LLM_PROVIDER=gemini`.
* Key Anthropic (diawali `sk-ant-`) menggunakan `LLM_PROVIDER=anthropic`.

### 3. Migrasi Database

Jalankan migrasi Prisma untuk membuat struktur tabel di SQLite:

```bash
npx prisma migrate dev

```

### 4. Jalankan Server Pengembang

```bash
npm run dev

```

Aplikasi dapat diakses melalui browser di alamat `http://localhost:3000`.

### 5. Build Produksi (Opsional)

Untuk menjalankan versi produksi:

```bash
npm run build
npm run start

```

---

## Alur dan Proses AI

Aplikasi mengintegrasikan alur pemrosesan AI dalam beberapa tahap utama:

1. Ekstraksi Teks Dokumentasi:
Dokumen yang diunggah (PDF, DOCX, TXT, MD) diproses langsung di tingkat server menggunakan library `pdf-parse` dan `mammoth`. Teks mentah disimpan ke dalam database untuk dijadikan referensi konteks.
2. Provider Agnostic Layer:
Integrasi AI dibangun menggunakan abstraksi adapter. Pergantian penyedia layanan (Gemini, OpenAI, Anthropic) dapat dilakukan cukup dengan mengubah konfigurasi di `.env.local` tanpa perlu mengubah logika kode aplikasi.
3. Chat Berbasis Konteks:
Pada ruang obrolan terkait materi tertentu, sistem mengambil teks materi terlampir dari database dan menyisipkannya ke dalam prompt dasar. Hal ini memastikan tanggapan AI relevan dengan bahan ajar pengguna. Apabila fitur pencarian web aktif, sistem memanfaatkan Tavily API untuk mengambil referensi data terbaru.
4. Pembuatan Kuis Terstruktur:
Materi yang dipilih dialirkan ke model AI dengan batasan skema output tertentu (diparsing menggunakan Zod) untuk menjamin luaran berupa JSON terstruktur yang berisi daftar pertanyaan pilihan ganda, pilihan jawaban, dan kunci penjelasan.

---

## Keputusan Teknis

* Next.js 16 (App Router): Dipilih untuk menangani rendering halaman (SSR), routing server-side, serta penanganan Server Actions untuk operasi data form dan pembuatan stream obrolan tanpa membebankan performa klien.
* SQLite + Prisma ORM: Kombinasi ini menyederhanakan kebutuhan database lokal tanpa perlu instalasi service tambahan, sekaligus menjaga fleksibilitas skema data berkat penanganan *type-safe* dari Prisma.
* Stream & Chunked Processing untuk Unggahan: File dokumen berukuran besar diproses secara bertahap melalui sistem penyimpanan sementara di disk guna menghindari masalah pemakaian memori berlebih (*Out of Memory*) pada runtime Node.js.
* Zod Validation: Digunakan untuk memvalidasi masukan pengguna pada endpoint, struktur variabel lingkungan, hingga validasi format JSON dari respons AI untuk pembuatan kuis.
* Tipografi & Antarmuka: Menggunakan kombinasi Tailwind CSS dengan font Lora untuk judul dan Inter untuk isi teks untuk memberikan kontras visual yang nyaman dibaca pada moda gelap maupun terang.

---

## Sumber API Key AI

* Google Gemini: [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
* OpenAI: [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
* Anthropic: [https://console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)