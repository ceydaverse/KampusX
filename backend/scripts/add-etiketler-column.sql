-- Etiketler kolonu ekleme script'i
-- Eğer dbo.Sorular tablosunda etiketler kolonu yoksa çalıştırın

-- Önce kolonun var olup olmadığını kontrol edin:
-- SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Sorular' AND COLUMN_NAME = 'etiketler';

-- Eğer yoksa şu komutu çalıştırın:
-- ALTER TABLE dbo.Sorular ADD etiketler NVARCHAR(MAX) NULL;

-- Etiketler JSON string olarak saklanacak (örnek: ["etiket1", "etiket2", "etiket3"])

