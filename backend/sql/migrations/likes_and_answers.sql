-- KampusX: Cevaplar, Beğeniler ve Soft Delete Migration
-- Tarih: 2025-01-14

-- ============================================
-- 1. Sorular tablosuna silindi kolonu ekle
-- ============================================
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.Sorular') 
    AND name = 'silindi'
)
BEGIN
    ALTER TABLE dbo.Sorular 
    ADD silindi BIT DEFAULT 0 NOT NULL;
    
    -- Mevcut kayıtlar için silindi = 0
    UPDATE dbo.Sorular SET silindi = 0 WHERE silindi IS NULL;
    
    PRINT 'Sorular.silindi kolonu eklendi';
END
ELSE
BEGIN
    PRINT 'Sorular.silindi kolonu zaten mevcut';
END
GO

-- ============================================
-- 2. Cevaplar tablosu oluştur
-- ============================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Cevaplar' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.Cevaplar (
        cevap_id INT IDENTITY(1,1) PRIMARY KEY,
        soru_id INT NOT NULL,
        kullanici_id INT NOT NULL,
        parent_cevap_id INT NULL,
        cevap_metin NVARCHAR(MAX) NOT NULL,
        tarih DATETIME DEFAULT GETDATE() NOT NULL,
        silindi BIT DEFAULT 0 NOT NULL,
        
        -- Foreign Keys
        CONSTRAINT FK_Cevaplar_Sorular 
            FOREIGN KEY (soru_id) 
            REFERENCES dbo.Sorular(soru_id) 
            ON DELETE CASCADE,
        
        CONSTRAINT FK_Cevaplar_Kullanicilar 
            FOREIGN KEY (kullanici_id) 
            REFERENCES dbo.Kullanicilar(kullanici_id) 
            ON DELETE CASCADE,
        
        CONSTRAINT FK_Cevaplar_ParentCevap 
            FOREIGN KEY (parent_cevap_id) 
            REFERENCES dbo.Cevaplar(cevap_id) 
            ON DELETE CASCADE
    );
    
    -- Indexler
    CREATE INDEX IX_Cevaplar_SoruId ON dbo.Cevaplar(soru_id);
    CREATE INDEX IX_Cevaplar_KullaniciId ON dbo.Cevaplar(kullanici_id);
    CREATE INDEX IX_Cevaplar_ParentCevapId ON dbo.Cevaplar(parent_cevap_id);
    CREATE INDEX IX_Cevaplar_Silindi ON dbo.Cevaplar(silindi);
    
    PRINT 'Cevaplar tablosu oluşturuldu';
END
ELSE
BEGIN
    PRINT 'Cevaplar tablosu zaten mevcut';
END
GO

-- ============================================
-- 3. SoruBegeniler tablosu oluştur
-- ============================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'SoruBegeniler' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.SoruBegeniler (
        soru_id INT NOT NULL,
        kullanici_id INT NOT NULL,
        tarih DATETIME DEFAULT GETDATE() NOT NULL,
        
        -- Composite Primary Key
        CONSTRAINT PK_SoruBegeniler 
            PRIMARY KEY (soru_id, kullanici_id),
        
        -- Foreign Keys
        CONSTRAINT FK_SoruBegeniler_Sorular 
            FOREIGN KEY (soru_id) 
            REFERENCES dbo.Sorular(soru_id) 
            ON DELETE CASCADE,
        
        CONSTRAINT FK_SoruBegeniler_Kullanicilar 
            FOREIGN KEY (kullanici_id) 
            REFERENCES dbo.Kullanicilar(kullanici_id) 
            ON DELETE CASCADE
    );
    
    -- Indexler
    CREATE INDEX IX_SoruBegeniler_SoruId ON dbo.SoruBegeniler(soru_id);
    CREATE INDEX IX_SoruBegeniler_KullaniciId ON dbo.SoruBegeniler(kullanici_id);
    
    PRINT 'SoruBegeniler tablosu oluşturuldu';
END
ELSE
BEGIN
    PRINT 'SoruBegeniler tablosu zaten mevcut';
END
GO

-- ============================================
-- 4. CevapBegeniler tablosu oluştur
-- ============================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'CevapBegeniler' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.CevapBegeniler (
        cevap_id INT NOT NULL,
        kullanici_id INT NOT NULL,
        tarih DATETIME DEFAULT GETDATE() NOT NULL,
        
        -- Composite Primary Key
        CONSTRAINT PK_CevapBegeniler 
            PRIMARY KEY (cevap_id, kullanici_id),
        
        -- Foreign Keys
        CONSTRAINT FK_CevapBegeniler_Cevaplar 
            FOREIGN KEY (cevap_id) 
            REFERENCES dbo.Cevaplar(cevap_id) 
            ON DELETE CASCADE,
        
        CONSTRAINT FK_CevapBegeniler_Kullanicilar 
            FOREIGN KEY (kullanici_id) 
            REFERENCES dbo.Kullanicilar(kullanici_id) 
            ON DELETE CASCADE
    );
    
    -- Indexler
    CREATE INDEX IX_CevapBegeniler_CevapId ON dbo.CevapBegeniler(cevap_id);
    CREATE INDEX IX_CevapBegeniler_KullaniciId ON dbo.CevapBegeniler(kullanici_id);
    
    PRINT 'CevapBegeniler tablosu oluşturuldu';
END
ELSE
BEGIN
    PRINT 'CevapBegeniler tablosu zaten mevcut';
END
GO

PRINT 'Migration tamamlandı! ✅';
GO












