-- Migration: SoruBegeniler ve CevapBegeniler tablolarına tarih kolonu ekle
-- Tarih: 2025-12-16
-- Açıklama: Like tablolarında tarih kolonu yoksa ekle (DEFAULT GETDATE())

-- ============================================
-- 1. SoruBegeniler tablosuna tarih kolonu ekle
-- ============================================
IF COL_LENGTH('dbo.SoruBegeniler', 'tarih') IS NULL
BEGIN
    ALTER TABLE dbo.SoruBegeniler
    ADD tarih DATETIME NOT NULL DEFAULT GETDATE();
    
    PRINT 'SoruBegeniler.tarih kolonu eklendi';
END
ELSE
BEGIN
    PRINT 'SoruBegeniler.tarih kolonu zaten mevcut';
END
GO

-- ============================================
-- 2. CevapBegeniler tablosuna tarih kolonu ekle
-- ============================================
IF COL_LENGTH('dbo.CevapBegeniler', 'tarih') IS NULL
BEGIN
    ALTER TABLE dbo.CevapBegeniler
    ADD tarih DATETIME NOT NULL DEFAULT GETDATE();
    
    PRINT 'CevapBegeniler.tarih kolonu eklendi';
END
ELSE
BEGIN
    PRINT 'CevapBegeniler.tarih kolonu zaten mevcut';
END
GO

-- ============================================
-- 3. Doğrulama sorguları (yorum satırı)
-- ============================================
-- SELECT TOP 5 * FROM dbo.SoruBegeniler ORDER BY tarih DESC;
-- SELECT TOP 5 * FROM dbo.CevapBegeniler ORDER BY tarih DESC;

PRINT 'Migration tamamlandı! ✅';
GO
