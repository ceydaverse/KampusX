-- Bildirimler tablosuna okundu desteği ekleme
-- Eğer tablo yoksa oluştur, varsa kolonları ekle

-- Bildirimler tablosu yoksa oluştur
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Bildirimler') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.Bildirimler (
        bildirim_id INT IDENTITY(1,1) PRIMARY KEY,
        kullanici_id INT NOT NULL,
        soru_id INT NULL,
        cevap_id INT NULL,
        mesaj NVARCHAR(MAX) NOT NULL,
        tip NVARCHAR(50) NOT NULL,
        tarih DATETIME NOT NULL DEFAULT GETDATE(),
        okundu BIT NOT NULL DEFAULT 0,
        okundu_tarih DATETIME NULL,
        CONSTRAINT FK_Bildirimler_Kullanici FOREIGN KEY (kullanici_id) REFERENCES dbo.Kullanicilar(kullanici_id),
        CONSTRAINT FK_Bildirimler_Soru FOREIGN KEY (soru_id) REFERENCES dbo.Sorular(soru_id),
        CONSTRAINT FK_Bildirimler_Cevap FOREIGN KEY (cevap_id) REFERENCES dbo.Cevaplar(cevap_id)
    );
    
    CREATE INDEX IX_Bildirimler_Kullanici ON dbo.Bildirimler(kullanici_id);
    CREATE INDEX IX_Bildirimler_Okundu ON dbo.Bildirimler(okundu);
    CREATE INDEX IX_Bildirimler_Tarih ON dbo.Bildirimler(tarih DESC);
END
GO

-- okundu kolonu yoksa ekle
IF COL_LENGTH('dbo.Bildirimler', 'okundu') IS NULL
BEGIN
    ALTER TABLE dbo.Bildirimler
    ADD okundu BIT NOT NULL DEFAULT 0;
    
    PRINT 'okundu kolonu eklendi';
END
GO

-- okundu_tarih kolonu yoksa ekle
IF COL_LENGTH('dbo.Bildirimler', 'okundu_tarih') IS NULL
BEGIN
    ALTER TABLE dbo.Bildirimler
    ADD okundu_tarih DATETIME NULL;
    
    PRINT 'okundu_tarih kolonu eklendi';
END
GO

-- Mevcut kayıtlar için okundu = 0 olduğundan emin ol
UPDATE dbo.Bildirimler
SET okundu = 0
WHERE okundu IS NULL;

PRINT 'Bildirimler tablosu okundu desteği ile güncellendi';









