'use strict';

// Tự động nhận diện host: Khi backend chạy trong Docker, gọi sang host máy tính qua host.docker.internal
const solrHost = (process.env.SOLR_HOST) || (process.env.DB_HOST === 'mysql' ? 'host.docker.internal' : '127.0.0.1');
const solrPort = process.env.SOLR_PORT || 8983;
const solrBaseUrl = `http://${solrHost}:${solrPort}/solr`;
const COLLECTION_NAME = 'hotel_rooms';
const SOLR_TIMEOUT_MS = 800;
const SOLR_CIRCUIT_COOLDOWN_MS = 60000;
let solrOfflineUntil = 0;

function fetchWithTimeout(url, options = {}) {
  if (Date.now() < solrOfflineUntil) {
    return Promise.reject(new Error('Solr offline circuit breaker open'));
  }
  return fetch(url, {
    ...options,
    signal: AbortSignal.timeout(SOLR_TIMEOUT_MS)
  }).catch((err) => {
    solrOfflineUntil = Date.now() + SOLR_CIRCUIT_COOLDOWN_MS;
    throw err;
  });
}

const solrClient = {
  collection: COLLECTION_NAME,

  async update(docs) {
    return this.addDocuments(docs);
  },
  /**
   * Kiểm tra kết nối Solr
   */
  async ping() {
    const res = await fetchWithTimeout(`${solrBaseUrl}/admin/info/system?wt=json`);
    if (!res.ok) throw new Error(`Solr ping failed with status ${res.status}`);
    return res.json();
  },

  /**
   * Đẩy bulk tài liệu lên Solr
   */
  async addDocuments(docs) {
    const res = await fetchWithTimeout(`${solrBaseUrl}/${COLLECTION_NAME}/update?commit=true`, {
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
      // 1. Tách từng từ và hỗ trợ đa tầng: Khớp chính xác cụm, Tiền tố Wildcard (*), và Khớp mờ (Fuzzy)
      const words = cleanKw.split(/\s+/).filter(Boolean);
      
      const queryParts = [
        // A. Khớp chính xác cụm từ (điểm ưu tiên cao nhất)
        `"${cleanKw}"^10.0`,
        // B. Khớp tất cả các từ cùng xuất hiện
        `(${words.join(' AND ')})^5.0`
      ];

      // C. Khớp tiền tố (Prefix / Gõ dở dang: vd Ney -> Ney*)
      const prefixWords = words.map(w => (w.includes('*') || w.includes('~')) ? w : `${w}*`);
      queryParts.push(`(${prefixWords.join(' AND ')})^2.0`);

      // D. Khớp mờ chịu sai/thiếu ký tự (Fuzzy)
      const fuzzyWords = words.map(w => {
        if (w.includes('~') || w.includes('*')) return w;
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
    url.searchParams.append('fl', '*,score'); // Yêu cầu Solr trả về trường score
    url.searchParams.append('rows', options.rows || 20);

    if (options.filterQuery) {
      url.searchParams.append('fq', options.filterQuery);
    }

    const res = await fetchWithTimeout(url.toString());
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Solr search error: ${res.status} - ${errText}`);
    }
    const json = await res.json();

    // Lọc theo ngưỡng tương quan (Score Cutoff): Nếu có từ khóa cụ thể,
    // loại bỏ các tài liệu có điểm quá thấp (< 35% điểm cao nhất)
    if (cleanKw && cleanKw !== '*:*' && json.response && json.response.docs) {
      const docs = json.response.docs;
      if (docs.length > 0 && typeof docs[0].score === 'number') {
        const maxScore = docs[0].score;
        const scoreThreshold = maxScore * 0.35;
        json.response.docs = docs.filter(doc => (doc.score || 0) >= scoreThreshold);
        json.response.numFound = json.response.docs.length;
      }
    }

    return json;
  }
};

module.exports = solrClient;
