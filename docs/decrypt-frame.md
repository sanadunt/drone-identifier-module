# Panduan Dekripsi Frame `$EncryptedDroneID`

## Cakupan

Aplikasi ini tidak mendekripsi cipher secara lokal. Aplikasi mengenali frame `$EncryptedDroneID`, mengambil nilai `encrypt_info`, lalu meneruskannya ke layanan dekripsi melalui HTTP. Hasil JSON layanan dipakai untuk menampilkan posisi drone/pilot di peta.

Panduan ini mendokumentasikan perilaku client pada bundle saat ini. Format cipher, cara membuat `signature`, dan validasi server tidak didefinisikan di repository ini; untuk itu diperlukan spesifikasi layanan dekripsi.

## Alur singkat

1. Aplikasi menerima data mentah dari koneksi serial atau TCP.
2. Parser menyusun frame yang dimulai dengan `$` dan diakhiri `,$end`.
3. Untuk `$EncryptedDroneID`, aplikasi membaca `encrypt_info`, `hash_code`, `rand_num`, dan `signature`.
4. Pada mode signature, `deviceId` diambil dari `serial` pada frame `$heartbeat` terakhir yang diterima melalui koneksi yang sama.
5. Client mengirim `encrypt_info` ke endpoint sesuai metode autentikasi.
6. Client membaca objek hasil dekripsi dari response JSON. Jika memiliki nomor seri dan koordinat valid, drone ditampilkan di peta.

Tab **Settings → Decrypt** tidak menyediakan kolom untuk menempelkan frame mentah. Pemanggilan decrypt pada bundle saat ini berjalan otomatis ketika parser menerima frame `$EncryptedDroneID` lengkap dari stream serial/TCP.

## Konfigurasi di GUI

Buka **Settings → Decrypt**.

| Pengaturan | Keterangan |
| --- | --- |
| Auth Method | `Device Signature` atau `Username/Password`. Default bundle adalah `Device Signature`. |
| Server IP | Host/IP layanan, tanpa path. Nilai default bundle saat ini `8.148.29.56`. |
| Port | Port tersimpan terpisah untuk masing-masing metode. Default signature `8443`; default password `5000`. |
| Username / Password | Hanya digunakan pada mode `Username/Password`. Tombol **Get Token** meminta token dan menampilkan statusnya. |

Perubahan konfigurasi disimpan ke `localStorage` aplikasi (`device-manager-settings`). Aplikasi tidak mengenkripsi password sebelum menyimpannya di sana.

## Format frame yang dikenali

Frame teks yang diproses berbentuk key-value dipisahkan koma; setiap key dan value dipisahkan oleh titik dua. Contoh berikut **ilustratif**—ganti seluruh nilai contoh dengan data dari perangkat/layanan yang sah:

```text
$heartbeat,serial:DEVICE-001,$end
$EncryptedDroneID,hash_code:HASH-001,encrypt_info:001122AABBCC,rand_num:123456,signature:SIGNATURE_FROM_DEVICE,$end
```

Makna field menurut client:

| Field | Penggunaan |
| --- | --- |
| `encrypt_info` | Wajib. Dikirim apa adanya sebagai `hexData` (mode signature) atau `hex` (mode password). |
| `hash_code` | Opsional; dipakai sebagai identitas fallback untuk deteksi tanpa posisi. |
| `rand_num` | Wajib pada mode signature; dikirim sebagai header `randomNum`. |
| `signature` | Wajib pada mode signature; dikirim sebagai header `signature`. |
| `serial` pada `$heartbeat` | Wajib pada mode signature; menjadi header `deviceId`. Harus diterima pada koneksi yang sama dengan frame terenkripsi. |

Client tidak mengubah atau memvalidasi format hex `encrypt_info`. Gunakan format yang ditentukan layanan—jangan mengasumsikan client menghapus `0x`, spasi, atau separator. Parser membagi field berdasarkan koma, jadi value frame tidak boleh mengandung koma yang tidak di-escape.
Nama marker dan field yang dibaca bersifat case-sensitive; gunakan ejaan pada contoh persis.

Parser dapat menyusun frame yang datang dalam beberapa potongan data. Marker akhir yang dicari adalah `,$end`; buffer frame peta dibatasi 1 MiB.

## Metode autentikasi dan API

Semua URL di bawah ini memakai `http://` pada bundle saat ini.

### Device Signature

Endpoint:

```text
POST http://<server>:<port>/api/1.0/dec
```

Header dan body yang dikirim client:

```http
Content-Type: application/json
v: 1.0
deviceId: <serial dari heartbeat>
randomNum: <rand_num dari frame>
signature: <signature dari frame>

{"hexData":"<encrypt_info dari frame>"}
```

`signature` tidak dihitung oleh aplikasi; nilai itu diambil dari frame masuk. Client hanya memeriksa bahwa `deviceId`, `randomNum`, dan `signature` tidak kosong. Default port metode ini adalah `8443`.

Contoh request `curl` (nilai placeholder tidak dapat didekripsi):

```sh
curl --include --request POST "http://${SERVER_IP}:${SERVER_PORT}/api/1.0/dec" \
  --header 'Content-Type: application/json' \
  --header 'v: 1.0' \
  --header "deviceId: ${DEVICE_ID}" \
  --header "randomNum: ${RAND_NUM}" \
  --header "signature: ${SIGNATURE}" \
  --data '{"hexData":"<encrypt_info dari frame>"}'
```

### Username/Password

Login mengambil token dari JSON response pada field `data.token`:

```text
GET http://<server>:<port>/api/login?username=<username>&password=<password>
```

Contoh bentuk response login:

```json
{
  "data": {
    "token": "<token>"
  }
}
```

Setelah itu client meminta decrypt:

```text
GET http://<server>:<port>/api/yd/decrypt?hex=<encrypt_info>&token=<token>
```

Contoh `curl` berikut hanya untuk server lokal/staging dengan akun uji. **Jangan gunakan password atau token sungguhan lewat HTTP**:

```sh
curl --include --get "http://${SERVER_IP}:${SERVER_PORT}/api/login" \
  --data-urlencode "username=${TEST_USERNAME}" \
  --data-urlencode "password=${TEST_PASSWORD}"

# Ambil data.token dari JSON response login secara lokal.
# Jangan menempelkan token ke chat, issue, atau log yang dibagikan.
curl --include --get "http://${SERVER_IP}:${SERVER_PORT}/api/yd/decrypt" \
  --data-urlencode "hex=${ENCRYPT_INFO}" \
  --data-urlencode "token=${TOKEN}"
```

Client menyimpan token di memori proses, dengan cache key host/port/username. Jika endpoint decrypt membalas 401, client membuang token, login ulang sekali, lalu mengulang request sekali. Tombol **Get Token** di Settings memaksa login baru. Default port mode ini adalah `5000`.

## Bentuk hasil yang dikenali

Client mengharapkan response body JSON. Ia mencari data pada salah satu bentuk berikut:

```json
{"result":{"decData":{"sn":"UAV-001","lat":-6.2,"lon":106.8,"alt":120,"yaw":45}}}
```

```json
{"result":{"sn":"UAV-001","lat":-6.2,"lon":106.8}}
```

```json
{"sn":"UAV-001","latitude":"-6.2","longitude":"106.8"}
```

Field yang dinormalisasi:

| Data | Nama field yang diterima |
| --- | --- |
| Nomor seri | `sn` (string) |
| Latitude | `lat` atau `latitude` |
| Longitude | `lon`, `lng`, atau `longitude` |
| Ketinggian | `alt`, `height`, atau `altitude` |
| Yaw | `yaw` atau `yaw_angle` |
| Latitude pilot | `pilot_lat` atau `latitude_polit` |
| Longitude pilot | `pilot_lon`, `pilot_lng`, atau `longitude_polit` |

Angka boleh berupa JSON number atau string numerik. Untuk marker drone, client memerlukan `sn`, latitude, dan longitude dalam rentang valid; koordinat `(0, 0)` ditolak. Ketinggian/yaw bersifat opsional. Client mencoba menambahkan marker pilot jika kedua koordinat pilot numerik dan tidak nol; cabang ini tidak menerapkan pemeriksaan rentang eksplisit seperti pada koordinat drone.

Pada jalur IPC, `decrypt:request` mengembalikan `{ success, data }`. `data` berisi `{ statusCode, headers, data }` dari HTTP response. Client tidak mengubah setiap HTTP status non-401 menjadi `success: false`; periksa `statusCode` dan body response juga.

## Troubleshooting

| Gejala | Pemeriksaan |
| --- | --- |
| Tidak ada request decrypt | Pastikan frame lengkap memakai `$EncryptedDroneID,` dan `,$end`, serta memiliki `encrypt_info`. Periksa koneksi serial/TCP aktif. |
| Mode signature melewati frame | Pastikan `$heartbeat,serial:...,$end` sudah diterima pada koneksi yang sama, dan frame memiliki `rand_num` serta `signature`. |
| Login/token gagal | Periksa username/password dan bentuk response login `data.token`. Status 401/403 atau token yang hilang menghasilkan error login. |
| Tidak ada marker di peta | Periksa `statusCode`, JSON response, `sn`, `lat`, dan `lon`; koordinat `(0, 0)` atau di luar rentang tidak dirender. |
| Frame terpotong/tidak lengkap | Periksa delimiter `,$end` dan format field koma/titik dua. Parser membuang frame tak lengkap saat buffer melewati 1 MiB. |
| Server tidak terjangkau | Client memberi timeout request 25 detik; error jaringan umum ditampilkan sebagai `Cannot connect to decrypt server.` |

## Keamanan dan batasan

- Client saat ini membangun URL dengan `http://` untuk kedua metode. Memasukkan `https://` pada kolom IP tidak mengaktifkan TLS: scheme dibuang lalu client tetap memakai HTTP.
- Mode password menaruh password dan token di query string. Mode password juga mengirim `encrypt_info` di query string. Jangan gunakan kredensial produksi melalui jaringan yang tidak tepercaya.
- Password disimpan di `localStorage`. Batasi akses ke profil pengguna dan jangan memakai ulang password penting.
- Helper request mencatat request body/header dan seluruh response ke log aplikasi. URL log menyamarkan parameter `password`/`token`, tetapi response token, `hexData`, field signature, dan data hasil dekripsi tidak seluruhnya disamarkan. Perlakukan log sebagai data sensitif.
- Algoritme decrypt, format kriptografi `encrypt_info`, pembentukan signature, serta aturan otorisasi adalah tanggung jawab layanan eksternal dan tidak dapat disimpulkan dari client ini.

## Implementasi terkait

- `app-unpacked/out/renderer/assets/index-Dl8IZmMw.js`: konfigurasi, parsing frame, pemanggilan decrypt otomatis, dan pemetaan hasil.
- `app-unpacked/out/main/main.js`: endpoint HTTP, cache token, timeout, logging, dan handler IPC.
- `app-unpacked/out/preload/preload.js`: API renderer `window.electronAPI.decrypt`.
