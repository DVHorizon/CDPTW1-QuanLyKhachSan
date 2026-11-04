'use strict';

// Tự động nhận diện host: nếu chạy trong Docker container (DB_HOST=mysql), trỏ ra máy host Windows bằng host.docker.internal
let solrBaseUrl = process.env.SOLR_URL || 'http://127.0.0.1:8983/solr';

if (process.env.DB_HOST === 'mysql' && solrBaseUrl.includes('127.0.0.1')) {
  solrBaseUrl = 'http://host.docker.internal:8983/solr';
}

const COLLECTION_NAME = 'hotel_rooms';

const solrClient = {
  baseUrl: solrBaseUrl,
  collection: COLLECTION_NAME,

  /**
   * Cập nhật / nạp tài liệu vào Solr bằng fetch API có sẵn của Node.js
   */
  async update(docs) {
    const url = `${solrBaseUrl}/${COLLECTION_NAME}/update?commit=true`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(docs)
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Solr update error: ${res.status} - ${errText}`);
    }
    return res.json();
  },

  /**
   * Truy vấn tìm kiếm trên Solr
   */
  async search(keyword, options = {}) {
    const url = new URL(`${solrBaseUrl}/${COLLECTION_NAME}/select`);
    const cleanKw = keyword ? keyword.trim() : '';

    if (!cleanKw || cleanKw === '*:*') {
      url.searchParams.append('q', '*:*');
    } else {
      // 1. Tách từng từ và hỗ trợ Fuzzy Search (~1) để chịu lỗi gõ sai/thiếu ký tự (vd: Neyar -> Neymar)
      const words = cleanKw.split(/\s+/).filter(Boolean);
      const fuzzyWords = words.map(w => (w.includes('~') || w.includes('*')) ? w : `${w}~1`);
      const finalQuery = `${cleanKw} OR (${fuzzyWords.join(' AND ')})`;

      // Dùng edismax parser tìm kiếm đa cột (name, description, amenities)
      url.searchParams.append('defType', 'edismax');
      url.searchParams.append('q', finalQuery);
      url.searchParams.append('qf', 'name^4.0 description^2.0 amenities^1.5');
    }

    url.searchParams.append('wt', 'json');
    url.searchParams.append('rows', options.rows || 20);

    if (options.filterQuery) {
      url.searchParams.append('fq', options.filterQuery);
    }

    const res = await fetch(url.toString());
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Solr search error: ${res.status} - ${errText}`);
    }
    return res.json();
  }
};

module.exports = solrClient;
