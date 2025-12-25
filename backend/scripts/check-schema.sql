-- KampusX DB Schema Check
-- dbo.Kullanicilar tablosunda dogum_yili ve cinsiyet kolonlarını kontrol et

-- Mevcut kolonları listele
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dbo' 
  AND TABLE_NAME = 'Kullanicilar'
  AND COLUMN_NAME IN ('dogum_yili', 'cinsiyet')
ORDER BY COLUMN_NAME;

-- Eğer cinsiyet kolonu yoksa, şu komutu çalıştır:
-- ALTER TABLE dbo.Kullanicilar ADD cinsiyet NVARCHAR(50) NULL;

-- Eğer dogum_yili kolonu yoksa, şu komutu çalıştır:
-- ALTER TABLE dbo.Kullanicilar ADD dogum_yili INT NULL;

