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
      // 1. Tách từng từ và hỗ trợ đa tầng: Khớp chính xác, Tiền tố Wildcard (*), và Fuzzy (~2)
      const words = cleanKw.split(/\s+/).filter(Boolean);
      
      const queryParts = [
        // A. Khớp chính xác cụm từ (điểm ưu tiên cao nhất)
        `"${cleanKw}"^5.0`,
        // B. Khớp từng từ chính xác
        `(${cleanKw})^3.0`
      ];

      // C. Khớp tiền tố (Prefix / Gõ dở dang: vd Ney -> Ney*)
      const prefixWords = words.map(w => (w.includes('*') || w.includes('~')) ? w : `${w}*`);
      queryParts.push(`(${prefixWords.join(' AND ')})^2.0`);

      // D. Khớp mờ chịu sai/thiếu tối đa 2 ký tự (Fuzzy ~2: vd Neym -> Neymar)
      const fuzzyWords = words.map(w => {
        if (w.includes('~') || w.includes('*')) return w;
        // Từ dài từ 4 ký tự trở lên cho phép lệch 2 ký tự (~2), từ ngắn lệch 1 ký tự (~1)
        return w.length >= 4 ? `${w}~2` : `${w}~1`;
      });
      queryParts.push(`(${fuzzyWords.join(' AND ')})^1.0`);

      const finalQuery = queryParts.join(' OR ');

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
