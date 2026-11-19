ELECTRICAL BASIC SIMULATOR V3
Identitas: Teknik Alat Berat – SMK Maharati
Aplikasi web offline untuk pembelajaran rangkaian kelistrikan DC dasar.

MENJALANKAN
1. Ekstrak ZIP.
2. Buka index.html dengan Chrome atau Microsoft Edge.
3. Tidak membutuhkan instalasi, server, atau internet.

FITUR
- Library 13 komponen dengan simbol skematik.
- Penempatan, pemilihan, rotasi, dan pemindahan komponen.
- Wiring terminal-ke-terminal dengan kabel ortogonal.
- Analisis rangkaian DC berbasis Modified Nodal Analysis (MNA) untuk sumber baterai dan beban resistif.
- Model resistansi resistor, lampu, fan, LDR, potensiometer, fuse, switch, button, dan kontak relay.
- Model dioda silikon sederhana dengan iterasi kondisi ON/OFF.
- Animasi aliran pada jalur yang bertegangan.
- Avometer virtual untuk pengukuran beda potensial dua titik.
- Simpan/buka rangkaian JSON dan ekspor gambar skematik PNG.
- Undo/redo, pencarian komponen, zoom, panel properti.

BATASAN MODEL V3
Ini adalah simulator edukasi DC dasar, bukan pengganti Proteus/SPICE untuk validasi desain atau keselamatan. NE555 ditampilkan sebagai komponen edukasi dengan properti frekuensi/duty cycle tetapi belum dimodelkan sebagai IC 8-pin dinamis dalam solver. Relay masih menggunakan model kontak sederhana; belum ada kopling elektromagnetik kumparan-kontak. Avometer arus dan ohm masih belum setara instrumen SPICE; pengukuran tegangan dua node adalah fungsi utamanya. Fuse memberikan peringatan arus lebih, tetapi belum otomatis meleleh secara termal. Model fan/lamp adalah beban resistif ekuivalen. Untuk praktik nyata, selalu verifikasi rangkaian dan rating komponen secara terpisah.
