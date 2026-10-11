# Rapi Materi

Web untuk merapikan materi kuliah: unggah file → pilih Semester, Mata Kuliah, Bab → file masuk ke
folder Google Drive `Materi Kuliah/Semester X/<Mata Kuliah>/Bab Y/` yang dibuat otomatis.

## Fitur
- Login Google, tombol **Ganti akun** (selalu memunculkan pilihan akun)
- Upload banyak file sekaligus ke folder otomatis
- Filter berjenjang: semester → mata kuliah → bab
- Tab **Terhapus dari Drive**: file yang dihapus (masuk Tempat Sampah) tetap tampil, bisa diunduh atau dipulihkan
- Tanpa database: info semester/matkul/bab disimpan di properti file Drive itu sendiri

## Cara menjalankan
1. Buka https://console.cloud.google.com → buat proyek → **APIs & Services → Library** → aktifkan **Google Drive API**.
2. **OAuth consent screen**: isi nama aplikasi, tambahkan emailmu sebagai *Test user* (selama status Testing).
3. **Credentials → Create credentials → OAuth client ID → Web application**.
   Tambahkan *Authorized redirect URI*: `http://localhost:3000/api/auth/callback`
4. Salin `.env.example` menjadi `.env.local`, lalu isi `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, dan `SESSION_SECRET`.
5. Jalankan:
   ```
   npm install
   npm run dev
   ```
   Buka http://localhost:3000

## Catatan penting
- **Batas pemulihan file:** Google menyimpan file di Tempat Sampah 30 hari. Setelah dihapus permanen, file tidak bisa
  diakses lagi. Untuk cadangan permanen, perlu menambah storage sendiri (mis. Supabase Storage / S3).
- **Scope `drive.file`:** web hanya melihat file yang diunggahnya sendiri, bukan seluruh isi Drive. File lama yang
  dipindahkan manual ke folder tidak akan tampil.
- **Deploy ke Vercel:** batas ukuran request ±4,5 MB per upload. Untuk file besar, deploy di server biasa
  (VPS/Railway/Render) atau ubah ke upload langsung ke Drive dari browser.
- Saat deploy, ganti `APP_URL` dan tambahkan redirect URI produksi di Google Cloud.
- Agar dipakai orang selain test user, ajukan verifikasi OAuth ke Google.
