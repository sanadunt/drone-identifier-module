# Ringkasan GUI dan Cara Menjalankan

GUI Device Manager menyediakan pilihan tampilan, bahasa, koneksi, format data, peta, dan konfigurasi perangkat. Perubahan warna, layout, ikon, teks, dan ukuran jendela bukan pengaturan pengguna; perubahan itu perlu edit kode.

Repo root menyediakan perintah npm untuk menjalankan hasil bundle di macOS. Ini memudahkan siklus edit dan restart untuk bundle JS/CSS, bukan development server atau hot reload: source aplikasi asli dan konfigurasi build tidak tersedia.

## Pengaturan yang tersedia di GUI

### Tampilan dan bahasa

- 11 tema: Tech, Light, Dark, Cyber, Minimal, Gemini, Terminal, Industrial, Ocean, Graphite, dan Dawn.
- 6 bahasa: Tionghoa (`zh`), Inggris (`en`), Spanyol (`es`), Prancis (`fr`), Vietnam (`vi`), dan Ukraina (`uk`). Bahasa sistem dipakai sebagai pilihan awal jika didukung.
- Pilihan tema dan bahasa disimpan di `localStorage`.

### Koneksi dan data

- Serial: port, baud rate, data bits, stop bits, parity, dan flow control.
- TCP: host, port, timeout, auto-reconnect, dan interval reconnect.
- Konfigurasi koneksi terakhir juga disimpan secara lokal.
- Tampilan data menyediakan format ASCII, UTF-8, dan HEX, serta aksi kirim, ekspor, dan hapus data.

### Peta dan GNSS

- Sumber peta: AMap jalan, AMap satelit, Google jalan, dan Google satelit.
- Pengaturan peta: WGS84 atau GCJ-02, posisi lokal otomatis atau manual, format koordinat desimal atau DMS, radius pemindaian, serta lintang dan bujur lokal.
- Peta menampilkan daftar drone dan panel detail objek yang dipilih.
- Halaman GNSS menampilkan plot satelit dan kekuatan sinyal GPS, BeiDou, dan GLONASS. Halaman ini memerlukan koneksi perangkat.

### Konfigurasi perangkat

Tab Settings memuat konfigurasi layanan dekripsi, modul logic, modul control, RF subboard, dan peta. Isinya mencakup metode autentikasi dan alamat server dekripsi, konfigurasi band/frekuensi, pengaturan RID dan Wi-Fi, serta jenis, atenuasi, dan jalur RF subboard. Beberapa kontrol memerlukan koneksi aktif dan bergantung pada versi hardware.

- Panduan lengkap alur dekripsi frame: [decrypt-frame.md](decrypt-frame.md).

## Perubahan tampilan melalui kode

Warna tema, komponen, label, urutan/layout panel, judul aplikasi, ikon, dan ukuran jendela dapat diubah di level kode. Titik awal yang relevan:

- `app-unpacked/out/renderer/assets/index-Dl8IZmMw.js`: komponen React, pilihan tema/bahasa, dan perilaku panel.
- `app-unpacked/out/renderer/assets/index-B627fAy7.css`: palet tema dan styling.
- `app-unpacked/resources/icon.png`: ikon aplikasi.
- `app-unpacked/out/main/main.js`: konfigurasi jendela Electron.

File renderer adalah hasil bundling, bukan source pengembangan asli. Repo tidak menyertakan source aplikasi TypeScript/TSX atau source map. Mengedit bundle langsung lebih rapuh daripada mengubah source asli, jadi pulihkan source dan konfigurasi build bila tersedia sebelum perubahan GUI besar.

## Status halaman yang perlu diuji

- Statistik menampilkan teks yang menyebut UI placeholder. Bundle juga berisi penghitung real-time, sementara data riwayat diinisialisasi dengan nilai nol. Verifikasi pada perangkat diperlukan sebelum mengandalkan hasilnya.
- Teks halaman upgrade menyebut perintah perangkat belum tersambung, tetapi bundle berisi alur transfer firmware YMODEM. Status sebenarnya belum diverifikasi dengan perangkat.
- Tab log modul secara eksplisit menyatakan log yang dikirim modul belum tersambung.

## Menjalankan secara lokal di macOS

Pastikan Node.js versi 22.12.0 atau lebih baru dan npm tersedia. Dari root repository, jalankan:

```sh
npm install
npm run dev
```

`npm install` memasang Electron 44.5.1 dari `package.json` root; dependensi runtime yang sudah ada di `app-unpacked/node_modules` tidak diubah. Skrip `dev` menjalankan `electron ./app-unpacked`, yang membaca entry point `./out/main/main.js` dari manifest aplikasi. File `.exe` Windows tidak dijalankan.

Jangan set `NODE_ENV=development` saat menjalankan skrip. Main process memakai nilai itu untuk memuat `http://localhost:5173`, tetapi repo tidak menyertakan Vite atau source untuk menjalankan server tersebut. Tanpa nilai itu, Electron memuat renderer hasil bundle lokal.

### Batasan dan keamanan

- Bundle Windows memakai Electron 28.3.3; rilis itu sudah end-of-support. Runner macOS sengaja memakai Electron 44.5.1 yang masih didukung saat konfigurasi ini dibuat. Versi runtime berbeda dapat menghasilkan perbedaan perilaku; uji fitur yang diubah, dan jangan anggap startup macOS membuktikan paket Windows.
- `serialport` yang tersedia memiliki binding Node-API 6 dan prebuild universal untuk macOS x64/arm64. Smoke test pada macOS arm64 memuat renderer dan menampilkan port serial `/dev/` yang terdeteksi; koneksi fisik dan komunikasi TCP belum diuji.
- Tidak tersedia source TypeScript/TSX, source map, build, atau hot reload. Perubahan pada bundle renderer atau CSS baru terlihat setelah aplikasi dimulai ulang; edit bundle langsung lebih rapuh daripada mengubah source asli.
- Main process menetapkan `webSecurity: false`. Jalankan hanya kode dan konten tepercaya; jangan gunakan konfigurasi ini untuk membuka halaman arbitrer.

Referensi runtime: [Electron 28.3.3 end-of-support](https://releases.electronjs.org/release/v28.3.3), [Electron 44.5.1](https://releases.electronjs.org/release/v44.5.1), [Electron support policy](https://www.electronjs.org/docs/latest/tutorial/electron-timelines), dan [Electron native Node modules](https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules).

## File bukti utama

- `package.json` and `package-lock.json` in the repository root
- `app-unpacked/package.json`
- `app-unpacked/out/main/main.js`
- `app-unpacked/out/renderer/assets/index-Dl8IZmMw.js`
- `app-unpacked/out/renderer/assets/index-B627fAy7.css`
