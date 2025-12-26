import React, { useEffect, useState } from "react";
import api from "../../../lib/api";

interface Bildirim {
  bildirim_id: number;
  mesaj: string;
  tip: string;
  tarih: string;
}

const BildirimPage: React.FC = () => {
  const [bildirimler, setBildirimler] = useState<Bildirim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/bildirimler/1") // 1 yerine gerçek kullanıcı ID
      .then((res) => {
        setBildirimler(res.data.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Yükleniyor...</p>;

  return (
    <div>
      <h1>Bildirimler</h1>
      <ul>
        {bildirimler.map((b) => (
          <li key={b.bildirim_id}>
            [{b.tip}] {b.mesaj} - {new Date(b.tarih).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BildirimPage;
