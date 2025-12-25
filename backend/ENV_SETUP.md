# 🔧 Environment Variables Setup

## Sorun: .env dosyası okunamıyor

Eğer `npm run env:check` komutu çalıştırıldığında env değişkenleri `undefined` görünüyorsa, aşağıdaki adımları takip edin:

## ✅ Çözüm Adımları

### 1. .env Dosyasının Konumu
- `.env` dosyası **backend** klasörünün içinde olmalıdır
- Dosya yolu: `backend/.env`

### 2. Dosya Adı Kontrolü
- Dosya adı tam olarak **`.env`** olmalıdır (nokta ile başlamalı)
- ❌ Yanlış: `env`, `.env.txt`, `env.txt`, `.env.local`
- ✅ Doğru: `.env`

### 3. Dosya Formatı
- Dosya **UTF-8** encoding ile kaydedilmiş olmalıdır
- **BOM (Byte Order Mark)** olmamalıdır
- Windows Notepad yerine **VS Code** veya **Notepad++** kullanın

### 4. .env Dosyası İçeriği Örneği

```env
DB_SERVER=localhost
DB_PORT=1433
DB_NAME=KampusX
DB_USER=sa
DB_PASSWORD=your_password_here
PORT=5000
```

### 5. Dosyayı Yeniden Oluşturma

1. Mevcut `.env` dosyasını silin veya yeniden adlandırın
2. VS Code'da yeni dosya oluşturun: `backend/.env`
3. İçeriği yukarıdaki formatta yazın
4. Dosyayı **UTF-8** olarak kaydedin (VS Code sağ alt köşede encoding gösterir)
5. `npm run env:check` komutunu tekrar çalıştırın

### 6. Test

```bash
cd backend
npm run env:check
```

Tüm değişkenler görünüyorsa ✅, hala `undefined` ise ❌ dosya formatını kontrol edin.

## 🔍 Debug

- `scripts/print-env.ts` script'i .env dosyasının varlığını, boyutunu ve yüklenen değişkenleri gösterir
- Terminal çıktısında `.env file exists: true/false` kontrol edin


