'use strict';

/**
 * BẢNG TỪ ĐIỂN TỪ ĐỒNG NGHĨA & NGỮ NGHĨA (SYNONYM DICTIONARY)
 * Giúp tìm kiếm ngữ nghĩa theo cơ chế Search Engine như Google:
 * 1. Từ đồng nghĩa ngữ nghĩa: "yêu" <-> "thích" <-> "khoái" <-> "mê"
 * 2. Từ dừng (Stop words): Loại bỏ các từ hư ngữ như "tôi", "muốn", "cho", "ở", "ăn", "uống" khi tìm kiếm món
 * 3. Ngữ cảnh ẩm thực & khách sạn:
 *    - "cá" <-> "hải sản", "fish", "tuyết", "hồi", "chẽm"
 *    - "bò" <-> "beef", "wagyu", "steak", "bít tết"
 *    - "bóng đá" <-> "football", "soccer", "túc cầu"
 */
const STOP_WORDS = new Set([
  'tôi', 'em', 'anh', 'chị', 'mình', 'chúng tôi', 'bạn',
  'muốn', 'cần', 'tìm', 'kiếm', 'cho', 'một', 'những', 'các',
  'ở', 'tại', 'với', 'và', 'hoặc', 'là', 'của', 'có', 'trong',
  'rất', 'quá', 'lắm', 'thì', 'mà', 'gì', 'nào', 'được'
]);

const SYNONYM_DICTIONARY = {
  // Cảm xúc, sở thích & nhu cầu (VD: tôi yêu bóng đá <-> tôi thích bóng đá)
  'yêu': ['thích', 'khoái', 'mê', 'chuộng', 'ghiền'],
  'thích': ['yêu', 'khoái', 'mê', 'chuộng', 'ghiền'],
  'khoái': ['thích', 'yêu', 'mê', 'ghiền'],
  'mê': ['thích', 'yêu', 'khoái', 'ghiền'],
  'ghiền': ['thích', 'mê', 'khoái'],
  
  // Chủ đề ví dụ thể thao / giải trí
  'bóng đá': ['football', 'soccer', 'túc cầu', 'thể thao'],
  'football': ['bóng đá', 'soccer', 'túc cầu'],
  'thể thao': ['bóng đá', 'tennis', 'gym', 'thể dục'],

  // Đánh giá chất lượng
  'ngon': ['hấp dẫn', 'đặc sắc', 'tuyệt phẩm', 'thượng hạng', 'hảo hạng', 'chuẩn vị', 'đậm đà'],
  'rẻ': ['bình dân', 'tiết kiệm', 'vừa túi tiền', 'hợp lý', 'giá tốt'],
  'sang': ['thượng hạng', 'cao cấp', 'premium', 'luxury', 'đắt tiền'],

  // Món ăn & Nguyên liệu
  'bò': ['beef', 'wagyu', 'bít tết', 'steak', 'thăn bò'],
  'heo': ['lợn', 'pork', 'ba chỉ', 'sườn'],
  'lợn': ['heo', 'pork', 'ba chỉ', 'sườn'],
  'gà': ['chicken', 'cánh gà', 'đùi gà'],
  'cá': ['fish', 'hải sản', 'tuyết', 'hồi', 'chẽm', 'ngừ', 'salmon', 'cod'],
  'tuyết': ['cá tuyết', 'cod', 'nauy'],
  'hồi': ['cá hồi', 'salmon'],
  'tôm': ['shrimp', 'prawn', 'hải sản', 'lobster', 'tôm hùm'],
  'mực': ['squid', 'hải sản', 'bạch tuộc'],
  'hải sản': ['seafood', 'cá', 'tôm', 'mực', 'cua', 'sò', 'ốc', 'nghêu'],

  // Cách chế biến
  'nướng': ['bbq', 'đút lò', 'áp chảo', 'grill', 'roast'],
  'chiên': ['rán', 'crispy', 'giòn', 'deep-fry'],
  'rán': ['chiên', 'crispy', 'giòn'],
  'hấp': ['steamed', 'luộc'],
  'lẩu': ['hotpot', 'nước dùng'],
  'xào': ['stir-fry', 'áp chảo'],
  'súp': ['soup', 'canh'],

  // Đồ uống & Tráng miệng
  'uống': ['nước', 'đồ uống', 'beverage', 'drink'],
  'nước': ['uống', 'đồ uống', 'beverage', 'drink', 'nước ngọt'],
  'rượu': ['vang', 'wine', 'cocktail', 'whisky', 'champagne', 'bia', 'beer'],
  'bia': ['beer', 'rượu', 'ale'],
  'cà phê': ['cafe', 'coffee', 'espresso', 'cappuccino', 'latte'],
  'trà': ['tea', 'trà đào', 'trà sen', 'matcha'],
  'ngọt': ['tráng miệng', 'dessert', 'bánh', 'kem', 'chè'],
  'bánh': ['cake', 'tiramisu', 'mousse', 'tart', 'pastry']
};

/**
 * Phân tích và mở rộng truy vấn kiểu Google (Semantic & Intent-based Search)
 * 1. Loại bỏ Stop Words (hư ngữ như "tôi", "muốn", "ở"...)
 * 2. Nhận diện các thực thể / từ khóa cốt lõi (Core Keywords)
 * 3. Mở rộng từ đồng nghĩa ngữ nghĩa (Synonyms) cho từng từ và cụm từ
 * 
 * Ví dụ đầu vào: "tôi yêu cá tuyết"
 * -> Core terms: ["yêu", "cá", "tuyết", "cá tuyết"]
 * -> Mở rộng: ["thích", "khoái", "mê", "hải sản", "fish", "cod", "nauy", "cá tuyết"]
 */
function expandQuerySemantics(keyword) {
  if (!keyword || typeof keyword !== 'string') return { coreTerms: [], expandedTerms: [], filteredText: '' };
  
  const clean = keyword.trim().toLowerCase();
  const rawWords = clean.split(/\s+/).filter(Boolean);
  
  // 1. Tách từ có ý nghĩa (bỏ stop words)
  const meaningfulWords = rawWords.filter(w => !STOP_WORDS.has(w));
  const coreWords = meaningfulWords.length > 0 ? meaningfulWords : rawWords;

  const expansions = new Set();
  const coreTerms = new Set();

  // Thêm cụm từ đã lọc stop words
  const filteredText = coreWords.join(' ');
  expansions.add(clean);
  if (filteredText && filteredText !== clean) {
    expansions.add(filteredText);
  }

  // 2. Kiểm tra cụm 2 từ (Bigrams)
  for (let i = 0; i < rawWords.length - 1; i++) {
    const pair = `${rawWords[i]} ${rawWords[i + 1]}`;
    if (SYNONYM_DICTIONARY[pair]) {
      coreTerms.add(pair);
      SYNONYM_DICTIONARY[pair].forEach(syn => expansions.add(syn));
    }
  }

  // 3. Kiểm tra từng từ đơn
  coreWords.forEach(w => {
    coreTerms.add(w);
    expansions.add(w);
    if (SYNONYM_DICTIONARY[w]) {
      SYNONYM_DICTIONARY[w].forEach(syn => expansions.add(syn));
    }
  });

  return {
    filteredText,
    coreTerms: Array.from(coreTerms),
    expandedTerms: Array.from(expansions)
  };
}

module.exports = {
  STOP_WORDS,
  SYNONYM_DICTIONARY,
  expandQuerySemantics
};
