-- Çözüm B: ana_kategori_id kolonunu ekle (eğer yoksa)
-- Bu migration, Kategoriler tablosuna ana_kategori_id kolonunu ekler
-- Eğer kolon zaten varsa, hata vermez

-- Önce kolonun var olup olmadığını kontrol et
IF COL_LENGTH('dbo.Kategoriler','ana_kategori_id') IS NULL
BEGIN
    ALTER TABLE dbo.Kategoriler ADD ana_kategori_id INT NULL;
    PRINT 'Kategoriler.ana_kategori_id kolonu eklendi';
END
ELSE
    PRINT 'Kategoriler.ana_kategori_id kolonu zaten mevcut';

-- Doğrulama için (isteğe bağlı)
SELECT TOP 5 kategori_id, kategori_adi, ana_kategori_id FROM dbo.Kategoriler;









