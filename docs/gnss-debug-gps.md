# GNSS dan Debug GPS

## Ringkasan

Halaman GNSS mengaktifkan debug GPS pada koneksi perangkat yang sedang aktif, lalu membaca frame `$debug_gps` dari serial atau TCP. Aplikasi mengirim command enable **sekali saat halaman GNSS diaktifkan**—bukan sekali untuk setiap pesan GPS. Saat halaman ditinggalkan atau koneksi aktif berubah, aplikasi mencoba mengirim command disable.

Alur saat ini:

```text
Koneksi serial/TCP aktif
  → buka tab GNSS
  → kirim $set_gps_debug,en:1,$end
  → perangkat membalas debug_log dan mengirim debug_gps
  → aplikasi merakit frame, mengubah delimiter NMEA, lalu memproses GSV
  → Sky Plot, hitungan satelit, dan grafik SNR diperbarui
  → tinggalkan tab GNSS
  → kirim $set_gps_debug,en:0,$end
```

## Command trigger

Saat tab GNSS aktif dan ada koneksi serial/TCP aktif, aplikasi mengirim byte UTF-8 berikut melalui koneksi tersebut:

```text
$set_gps_debug,en:1,$end
```

Tidak perlu mengetik command manual saat memakai aplikasi; klik tab GNSS akan memicu pengiriman. Aplikasi tidak menambahkan newline pada string command.

Untuk uji manual, kirim command itu ke koneksi TCP/serial perangkat yang sama—bukan ke port HTTP/web—lalu periksa balasan perangkat. Saat keluar dari tab atau koneksi berubah, aplikasi mencoba mengirim:

```text
$set_gps_debug,en:0,$end
```

Pengiriman disable adalah best-effort; error saat cleanup diabaikan oleh UI. Jika tab dibuka tanpa koneksi aktif, command enable tidak dikirim dan status menjadi `noConnection`.

### Status di halaman GNSS

| Status | Arti di implementasi |
| --- | --- |
| `noConnection` | Tidak ada koneksi aktif yang tersambung. |
| `enabling` | Aplikasi sedang mengirim command enable. |
| `waiting` | Pemanggilan send berhasil; aplikasi menunggu frame debug GPS. Ini belum membuktikan perangkat membalas `result:ok`. |
| `receiving` | Aplikasi menerima frame berawalan `$debug_gps,msg:`. Status ini tidak berarti sudah ada fix atau satelit. |
| `failed` | Pemanggilan send gagal atau melempar error. |

Balasan `$debug_log` tidak dipakai sebagai ACK oleh parser GNSS. Status `waiting` berasal dari hasil fungsi send; status `receiving` berasal dari frame `$debug_gps` pertama.

## Contoh keluaran

Contoh di bawah mengikuti format log perangkat yang diamati. Serial pada heartbeat disamarkan:

```text
[15:14:20.783] ↙ $debug_log,cmd:set_gps_debug,param:en,value:1,result:ok,$end
[15:14:21.505] ↙ $debug_gps,msg:GNGGA;;;;;;0;00;25.5;;;;;;*64,$end
[15:14:21.505] ↙ $heartbeat,serial:DEVICE-001,lat:0.0,lng:0.0,$end
[15:14:21.505] ↙ $debug_gps,msg:GNGLL;;;;;;V;N*7A,$end
[15:14:21.505] ↙ $debug_gps,msg:GPGSA;A;1;;;;;;;;;;;;;25.5;25.5;25.5*02,$end
[15:14:21.505] ↙ $debug_gps,msg:BDGSA;A;1;;;;;;;;;;;;;25.5;25.5;25.5*13,$end
[15:14:21.505] ↙ $debug_gps,msg:GLGSA;A;1;;;;;;;;;;;;;25.5;25.5;25.5*1E,$end
[15:14:21.505] ↙ $debug_gps,msg:GPGSV;1;1;00*79,$end
[15:14:21.505] ↙ $debug_gps,msg:BDGSV;1;1;00*68,$end
[15:14:21.505] ↙ $debug_gps,msg:GLGSV;1;1;00*65,$end
[15:14:21.505] ↙ $debug_gps,msg:GNRMC;;V;;;;;;;;;;N*4D,$end
[15:14:21.505] ↙ $debug_gps,msg:GNVTG;;;;;;;;;N*2E,$end
[15:14:21.505] ↙ $debug_gps,msg:GNZDA;;;;;;*56,$end
[15:14:21.505] ↙ $debug_gps,msg:GPTXT;01;01;01;ANTENNA OPEN*25,$end
```

Baris pertama adalah balasan perangkat yang menunjukkan `result:ok`. Baris berikutnya adalah data debug. Frame `$heartbeat` terpisah dari parser NMEA GNSS.

## Cara data diterapkan ke halaman GNSS

1. Aplikasi mendengarkan data mentah hanya dari koneksi yang diaktifkan untuk halaman GNSS, lalu menyaring `connectionId` lain.
2. Data UTF-8 dapat tiba terpotong-potong. Parser menggabungkannya sampai menemukan frame `$...,$end`; buffer maksimal 32 KiB.
3. Hanya frame dengan prefix `$debug_gps,msg:` yang diteruskan ke parser GPS. Isi `msg` diubah dari delimiter `;` menjadi `,` untuk membentuk kalimat NMEA.
4. Parser halaman GNSS hanya menggunakan pesan `GSV` untuk tampilan satelit. Pesan `GGA`, `GLL`, `GSA`, `RMC`, `VTG`, `ZDA`, dan `TXT` tidak dipakai untuk menghitung fix atau posisi pada halaman ini.
5. Data GSV diterapkan saat nomor pesan mencapai `totalMessages` (pesan terakhir dalam siklus). Setiap satelit dibaca dalam grup field PRN, elevasi, azimuth, dan SNR.

Prefix talker yang dipetakan saat ini:

| Prefix | Sistem |
| --- | --- |
| `GP` | GPS |
| `BD` atau `GB` | BeiDou |
| `GL` | GLONASS |

Prefix NMEA lain, termasuk `GN` generik, tidak dipetakan sebagai sistem pada parser GNSS saat ini.

Halaman menampilkan **Sky Plot**, hitungan satelit per sistem, jumlah satelit keseluruhan, dan grafik kekuatan sinyal SNR dalam dB-Hz dengan skala 0–60. Satelit diplot bila elevasi dan azimuth tersedia; nilai SNR dipakai oleh grafik.

## Membaca contoh keluaran di atas

Contoh ini menunjukkan bahwa debug berhasil aktif, tetapi belum ada fix GNSS:

- `GPGSV;1;1;00`, `BDGSV;1;1;00`, dan `GLGSV;1;1;00` melaporkan total `00` satelit. Halaman akan menerima data, tetapi hitungan tetap nol dan tidak ada satelit untuk diplot.
- `GNGGA` menunjukkan fix quality `0` dan jumlah satelit `00`; kolom posisi kosong.
- `GNGLL` dan `GNRMC` berstatus `V` (data tidak valid). `GSA` dengan mode `1` juga menunjukkan belum ada fix.
- `GPTXT` melaporkan `ANTENNA OPEN`. Periksa antena, konektor, kabel, dan suplai antena aktif sesuai spesifikasi perangkat.
- Heartbeat dengan `lat:0.0,lng:0.0` tidak memberi posisi valid untuk peta.

Karena halaman GNSS hanya mengonsumsi GSV, status UI dapat berubah ke `receiving` walaupun GGA/GLL menunjukkan no-fix dan semua hitungan GSV nol. Status `receiving` berarti frame debug diterima, bukan GNSS sudah memperoleh posisi.

## Troubleshooting

| Gejala | Pemeriksaan |
| --- | --- |
| Status tetap `noConnection` | Pastikan koneksi serial/TCP yang dipilih berstatus connected. |
| Status `failed` setelah buka GNSS | Pastikan perangkat menerima data pada koneksi yang aktif; periksa error send dan konfigurasi port/baud rate atau TCP host/port. |
| Status `waiting` terus | Send lokal berhasil, tetapi belum ada frame `$debug_gps,msg:`. Pastikan firmware mendukung command, periksa ACK `debug_log`, lalu cek koneksi/perangkat. |
| Status `receiving`, Sky Plot kosong | Frame debug ada, tetapi belum tentu berisi GSV yang didukung. Periksa GPGSV/BDGSV/GBGSV/GLGSV dan total satelitnya. |
| Jumlah satelit nol atau SNR kosong | Periksa field total satelit dan grup PRN/elevasi/azimuth/SNR di GSV; pada contoh di atas perangkat melaporkan nol satelit dan `ANTENNA OPEN`. |
| Tidak ada pembaruan setelah meninggalkan lalu membuka GNSS | Tab mengirim enable saat aktif dan disable saat cleanup. Pastikan koneksi masih hidup dan cek apakah perangkat membalas command enable. |

## File implementasi

Perilaku ini ada di bundle renderer:

- `app-unpacked/out/renderer/assets/index-Dl8IZmMw.js`: command enable/disable, parser NMEA/GSV, siklus koneksi, status UI, dan visualisasi GNSS.

Repository menyimpan bundle hasil build, bukan source React asli. Nama fungsi dan nomor baris dapat berubah saat bundle dibuat ulang.
