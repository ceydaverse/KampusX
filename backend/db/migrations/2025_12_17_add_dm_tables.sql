-- DM Modülü için Tablolar
-- Sessize Al, Engelle, Okundu Bilgisi

-- 1. Kullanıcı Engelleme Tablosu
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Kullanici_Engel') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.Kullanici_Engel (
        engel_id INT IDENTITY(1,1) PRIMARY KEY,
        engelleyen_id INT NOT NULL,
        engellenen_id INT NOT NULL,
        tarih DATETIME NOT NULL DEFAULT GETDATE(),
        aktif BIT NOT NULL DEFAULT 1,
        CONSTRAINT FK_Kullanici_Engel_Engelleyen FOREIGN KEY (engelleyen_id) REFERENCES dbo.Kullanicilar(kullanici_id),
        CONSTRAINT FK_Kullanici_Engel_Engellenen FOREIGN KEY (engellenen_id) REFERENCES dbo.Kullanicilar(kullanici_id),
        CONSTRAINT UQ_Kullanici_Engel_Unique UNIQUE (engelleyen_id, engellenen_id)
    );
    
    CREATE INDEX IX_Kullanici_Engel_Engelleyen ON dbo.Kullanici_Engel(engelleyen_id);
    CREATE INDEX IX_Kullanici_Engel_Engellenen ON dbo.Kullanici_Engel(engellenen_id);
    CREATE INDEX IX_Kullanici_Engel_Aktif ON dbo.Kullanici_Engel(aktif);
END
GO

-- 2. Kullanıcı Sessize Alma Tablosu
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Kullanici_SessizeAlinan') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.Kullanici_SessizeAlinan (
        sessize_id INT IDENTITY(1,1) PRIMARY KEY,
        kullanici_id INT NOT NULL,
        hedef_kullanici_id INT NOT NULL,
        baslangic_tarih DATETIME NOT NULL DEFAULT GETDATE(),
        bitis_tarih DATETIME NULL,
        aktif BIT NOT NULL DEFAULT 1,
        CONSTRAINT FK_Kullanici_Sessize_Kullanici FOREIGN KEY (kullanici_id) REFERENCES dbo.Kullanicilar(kullanici_id),
        CONSTRAINT FK_Kullanici_Sessize_Hedef FOREIGN KEY (hedef_kullanici_id) REFERENCES dbo.Kullanicilar(kullanici_id),
        CONSTRAINT UQ_Kullanici_Sessize_Unique UNIQUE (kullanici_id, hedef_kullanici_id)
    );
    
    CREATE INDEX IX_Kullanici_Sessize_Kullanici ON dbo.Kullanici_SessizeAlinan(kullanici_id);
    CREATE INDEX IX_Kullanici_Sessize_Hedef ON dbo.Kullanici_SessizeAlinan(hedef_kullanici_id);
    CREATE INDEX IX_Kullanici_Sessize_Aktif ON dbo.Kullanici_SessizeAlinan(aktif);
END
GO

-- 3. Mesaj Okunma Tablosu (Read Receipts)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Mesaj_Okunma') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.Mesaj_Okunma (
        okunma_id INT IDENTITY(1,1) PRIMARY KEY,
        mesaj_id INT NOT NULL,
        kullanici_id INT NOT NULL,
        okundu_tarih DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_Mesaj_Okunma_Mesaj FOREIGN KEY (mesaj_id) REFERENCES dbo.Mesajlasma(mesaj_id),
        CONSTRAINT FK_Mesaj_Okunma_Kullanici FOREIGN KEY (kullanici_id) REFERENCES dbo.Kullanicilar(kullanici_id),
        CONSTRAINT UQ_Mesaj_Okunma_Unique UNIQUE (mesaj_id, kullanici_id)
    );
    
    CREATE INDEX IX_Mesaj_Okunma_Mesaj ON dbo.Mesaj_Okunma(mesaj_id);
    CREATE INDEX IX_Mesaj_Okunma_Kullanici ON dbo.Mesaj_Okunma(kullanici_id);
    CREATE INDEX IX_Mesaj_Okunma_Tarih ON dbo.Mesaj_Okunma(okundu_tarih);
END
GO

PRINT 'DM modülü tabloları oluşturuldu: Kullanici_Engel, Kullanici_SessizeAlinan, Mesaj_Okunma';










