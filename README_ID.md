# PSSAB Tanjung Uncang — Android / Google Play

Project Android wrapper untuk aplikasi PSSAB v28 yang saat ini berjalan di Cloudflare Worker.

- Nama aplikasi: **PSSAB Tanjung Uncang**
- Application ID: `com.pssab.tanjunguncang`
- Target SDK: **36 (Android 16)**
- URL aplikasi: `https://pssab-v28.chelsea12222222.workers.dev/`
- Version: `1.0.0` / versionCode 1

## Catatan penting
Application ID sebaiknya jangan diubah setelah aplikasi pertama dibuat di Google Play.

## Build AAB
Buka folder ini di Android Studio versi terbaru, lalu pilih **Build > Generate Signed App Bundle / APK > Android App Bundle**.

Untuk Google Play, gunakan **Android App Bundle (.aab)** dan aktifkan **Google Play App Signing** saat diminta.

## Permissions
Aplikasi meminta CAMERA untuk Scan QR dan akses lokasi karena WebView perlu mendukung fitur PWA yang mungkin meminta lokasi. Jika fitur lokasi tidak digunakan, permission lokasi dapat dihapus pada versi berikutnya.

## Pengujian wajib sebelum upload
1. Login Admin.
2. Buka Ibadah dan Daftar Hadir.
3. Uji Tampilkan QR.
4. Uji Scan QR Kehadiran.
5. Uji upload foto profil.
6. Uji ID Card.
7. Uji Chat.
8. Uji email konfirmasi akun baru.
