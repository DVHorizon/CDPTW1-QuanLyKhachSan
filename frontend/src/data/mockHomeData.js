/**
 * Dữ liệu Mock chuẩn mực cho Trang chủ Grand Horizon Hotels & Resorts
 * Phục vụ Sprint 1 - Chức năng F14: Xây dựng trang chủ giới thiệu khách sạn & các hạng phòng nổi bật
 */

export const mockBranches = [
  {
    BranchId: 1,
    BranchName: 'Grand Horizon Resort Phú Quốc Oasis',
    City: 'Phú Quốc, Kiên Giang',
    Address: 'Bãi Trường, Dương Tơ, TP. Phú Quốc, Kiên Giang',
    Phone: '0297 388 6868',
    Email: 'phuquoc@grandhorizon.com',
    TotalRooms: 180,
    Rating: 4.9,
    ImageUrl: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=1200&auto=format&fit=crop',
    Highlight: 'Ốc đảo nhiệt đới riêng biệt với 1km bờ biển cát trắng'
  },
  {
    BranchId: 2,
    BranchName: 'Grand Horizon Cam Ranh Sanctuary',
    City: 'Cam Ranh, Khánh Hòa',
    Address: 'Bãi Dài, Bán đảo Cam Ranh, Cam Lâm, Khánh Hòa',
    Phone: '0258 398 8888',
    Email: 'camranh@grandhorizon.com',
    TotalRooms: 150,
    Rating: 5.0,
    ImageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1200&auto=format&fit=crop',
    Highlight: 'Biệt thự hồ bơi riêng biệt hướng trọn biển Bãi Dài ngọc bích'
  },
  {
    BranchId: 3,
    BranchName: 'Grand Horizon Đà Nẵng Heritage',
    City: 'Đà Nẵng',
    Address: 'Đường Võ Nguyên Giáp, Quận Ngũ Hành Sơn, TP. Đà Nẵng',
    Phone: '0236 392 9999',
    Email: 'danang@grandhorizon.com',
    TotalRooms: 120,
    Rating: 4.9,
    ImageUrl: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=1200&auto=format&fit=crop',
    Highlight: 'Tọa lạc bên bờ biển Mỹ Khê - top bãi biển quyến rũ nhất hành tinh'
  },
  {
    BranchId: 4,
    BranchName: 'Grand Horizon Vịnh Hạ Long Palace',
    City: 'Hạ Long, Quảng Ninh',
    Address: 'Bán đảo Tuần Châu, TP. Hạ Long, Quảng Ninh',
    Phone: '0203 384 6666',
    Email: 'halong@grandhorizon.com',
    TotalRooms: 100,
    Rating: 4.8,
    ImageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop',
    Highlight: 'Tầm nhìn ngoạn mục hướng toàn cảnh kỳ quan thiên nhiên thế giới'
  }
];

export const mockRoomTypes = [
  {
    RoomTypeId: 1,
    TypeName: 'Deluxe Ocean View Suite',
    Category: 'suite',
    Description: 'Không gian tĩnh tại với tầm nhìn panorama biển xanh, ban công tắm nắng riêng biệt và nội thất gỗ tự nhiên tinh xảo.',
    BasePrice: 1850000,
    OriginalPrice: 2200000,
    MaxOccupancy: 3,
    AdultCapacity: 2,
    ChildCapacity: 1,
    SizeM2: 55,
    BedType: '1 Giường King hoặc 2 Giường đơn',
    ViewType: 'Trực diện biển (Oceanfront)',
    Badge: 'Signature Suite',
    Rating: 4.9,
    TotalReviews: 128,
    ImageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1200&auto=format&fit=crop',
    Gallery: [
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?q=80&w=1200&auto=format&fit=crop'
    ],
    Amenities: [
      { name: 'Bữa sáng buffet 5 sao', icon: 'restaurant' },
      { name: 'Ban công tắm nắng riêng', icon: 'deck' },
      { name: 'Bồn tắm ngắm biển', icon: 'bathtub' },
      { name: 'Wifi tốc độ cao', icon: 'wifi' },
      { name: 'Smart TV 55 inch 4K', icon: 'tv' },
      { name: 'Trà & cà phê cao cấp', icon: 'coffee' }
    ]
  },
  {
    RoomTypeId: 2,
    TypeName: 'Executive Beachfront Villa',
    Category: 'villa',
    Description: 'Tầm nhìn 180 độ ôm trọn khoảnh khắc hoàng hôn rực rỡ, hồ bơi riêng tràn bờ và lối dạo biển biệt lập độc quyền.',
    BasePrice: 3200000,
    OriginalPrice: 3800000,
    MaxOccupancy: 4,
    AdultCapacity: 3,
    ChildCapacity: 1,
    SizeM2: 110,
    BedType: '1 Giường Super King',
    ViewType: 'Bãi biển riêng & Hồ bơi vô cực',
    Badge: 'Khuyên Chọn Nhất',
    Rating: 5.0,
    TotalReviews: 96,
    ImageUrl: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=1200&auto=format&fit=crop',
    Gallery: [
      'https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=1200&auto=format&fit=crop'
    ],
    Amenities: [
      { name: 'Hồ bơi riêng tràn bờ', icon: 'pool' },
      { name: 'Lối đi biển biệt lập', icon: 'surfing' },
      { name: 'Bữa sáng nổi tại hồ bơi', icon: 'brunch_dining' },
      { name: 'Bồn sục Jacuzzi đôi', icon: 'hot_tub' },
      { name: 'Quản gia riêng 24/7', icon: 'concierge' },
      { name: 'Đưa đón Limousine 2 chiều', icon: 'directions_car' }
    ]
  },
  {
    RoomTypeId: 3,
    TypeName: 'Presidential Penthouse Residence',
    Category: 'suite',
    Description: 'Đỉnh cao phong cách sống thượng lưu tại tầng cao nhất, phòng khách lộng lẫy cùng quầy bar riêng và dịch vụ quản gia hoàng gia.',
    BasePrice: 5500000,
    OriginalPrice: 6500000,
    MaxOccupancy: 6,
    AdultCapacity: 4,
    ChildCapacity: 2,
    SizeM2: 185,
    BedType: '2 Phòng ngủ (2 Giường King)',
    ViewType: 'Toàn cảnh vịnh biển 360 độ',
    Badge: 'Thượng Lưu 5 Sao',
    Rating: 5.0,
    TotalReviews: 42,
    ImageUrl: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=1200&auto=format&fit=crop',
    Gallery: [
      'https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1613977257363-707ba9348227?q=80&w=1200&auto=format&fit=crop'
    ],
    Amenities: [
      { name: 'Dịch vụ Quản gia cá nhân', icon: 'concierge' },
      { name: 'Hồ bơi chân mây trên cao', icon: 'pool' },
      { name: 'Quầy rượu vang & Sommelier', icon: 'wine_bar' },
      { name: 'Đưa đón Limousine VIP', icon: 'airport_shuttle' },
      { name: 'Bếp trưởng phục vụ tiệc riêng', icon: 'dinner_dining' },
      { name: 'Trị liệu Spa miễn phí 60p', icon: 'spa' }
    ]
  },
  {
    RoomTypeId: 4,
    TypeName: 'Grand Family Garden Villa',
    Category: 'family',
    Description: 'Lựa chọn lý tưởng cho đại gia đình với 2 phòng ngủ liên thông, sân vườn cỏ xanh ngát và hồ cá Koi thư thái an yên.',
    BasePrice: 2850000,
    OriginalPrice: 3400000,
    MaxOccupancy: 5,
    AdultCapacity: 3,
    ChildCapacity: 2,
    SizeM2: 95,
    BedType: '1 Giường King + 2 Giường đơn',
    ViewType: 'Vườn nhiệt đới & Hồ Koi',
    Badge: 'Dành Cho Gia Đình',
    Rating: 4.8,
    TotalReviews: 87,
    ImageUrl: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?q=80&w=1200&auto=format&fit=crop',
    Gallery: [
      'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?q=80&w=1200&auto=format&fit=crop'
    ],
    Amenities: [
      { name: '2 Phòng ngủ nối thông', icon: 'meeting_room' },
      { name: 'Sân vườn nhiệt đới riêng', icon: 'park' },
      { name: 'Khu vui chơi trẻ em Kid Club', icon: 'child_friendly' },
      { name: 'Bếp gia đình tiện nghi', icon: 'kitchen' },
      { name: 'Xe buggy nội khu 24/7', icon: 'electric_rickshaw' },
      { name: 'Bữa sáng gia đình', icon: 'restaurant' }
    ]
  },
  {
    RoomTypeId: 5,
    TypeName: 'Sunset Royal Overwater Bungalow',
    Category: 'villa',
    Description: 'Tọa lạc trên mặt nước biển phẳng lặng, sàn kính ngắm san hô rực rỡ và võng lưới lơ lửng giữa đại dương xanh thẳm.',
    BasePrice: 3950000,
    OriginalPrice: 4600000,
    MaxOccupancy: 3,
    AdultCapacity: 2,
    ChildCapacity: 1,
    SizeM2: 85,
    BedType: '1 Giường Super King',
    ViewType: 'Hoàng hôn đại dương tuyệt mỹ',
    Badge: 'Lãng Mạn & Cặp Đôi',
    Rating: 5.0,
    TotalReviews: 64,
    ImageUrl: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?q=80&w=1200&auto=format&fit=crop',
    Gallery: [
      'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1200&auto=format&fit=crop'
    ],
    Amenities: [
      { name: 'Sàn kính ngắm san hô', icon: 'visibility' },
      { name: 'Võng lưới trên mặt biển', icon: 'water' },
      { name: 'Rượu sâm banh đón tiếp', icon: 'local_bar' },
      { name: 'Bữa tối lãng mạn bãi biển', icon: 'dinner_dining' },
      { name: 'Thiết bị chèo kayak miễn phí', icon: 'kayaking' }
    ]
  },
  {
    RoomTypeId: 6,
    TypeName: 'Heritage Panoramic Corner Suite',
    Category: 'deluxe',
    Description: 'Hai mặt kính trong suốt ôm trọn góc nhìn bình minh biển và núi non hùng vĩ, bồn tắm sủi bọt sang trọng ngắm chân trời.',
    BasePrice: 2150000,
    OriginalPrice: 2500000,
    MaxOccupancy: 3,
    AdultCapacity: 2,
    ChildCapacity: 1,
    SizeM2: 65,
    BedType: '1 Giường King đệm tơ tằm',
    ViewType: 'Hai mặt kính View biển & Vịnh',
    Badge: 'Góc Nhìn Tuyệt Tác',
    Rating: 4.9,
    TotalReviews: 73,
    ImageUrl: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?q=80&w=1200&auto=format&fit=crop',
    Gallery: [
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=1200&auto=format&fit=crop'
    ],
    Amenities: [
      { name: 'Kính cong panorama kịch trần', icon: 'crop_free' },
      { name: 'Bồn tắm sủi bọt ngắm biển', icon: 'bathtub' },
      { name: 'Máy pha cà phê Nespresso', icon: 'coffee_maker' },
      { name: 'Loa âm thanh vòm Marshall', icon: 'speaker' },
      { name: 'Trà thảo mộc bản địa', icon: 'emoji_food_beverage' }
    ]
  }
];

export const mockAmenities = [
  {
    AmenityId: 1,
    AmenityName: 'Hồ Bơi Vô Cực Chân Mây',
    Description: 'Hồ bơi nước mặn tràn bờ nối liền đại dương, quầy pool bar sang trọng phục vụ cocktail nhiệt đới.',
    IconName: 'pool'
  },
  {
    AmenityId: 2,
    AmenityName: 'Grand Horizon Spa & Wellness',
    Description: 'Các liệu trình trị liệu cổ truyền kết hợp tinh dầu thảo dược hữu cơ, xông hơi đá muối Himalaya.',
    IconName: 'spa'
  },
  {
    AmenityId: 3,
    AmenityName: 'Bãi Biển Riêng Biệt Lập',
    Description: 'Hơn 1km dải cát trắng mịn màng độc quyền, ghế nằm thư giãn và dịch vụ phục vụ đồ uống tại chỗ.',
    IconName: 'beach_access'
  },
  {
    AmenityId: 4,
    AmenityName: 'Nhà Hàng Biển Fine Dining The Azure',
    Description: 'Ẩm thực fusion hải sản cao cấp chế biến bởi đầu bếp 5 sao, hầm rượu vang với hơn 300 niên vụ.',
    IconName: 'restaurant'
  },
  {
    AmenityId: 5,
    AmenityName: 'Trung Tâm Thể Hình & Yoga Hướng Biển',
    Description: 'Trang thiết bị Technogym hiện đại, lớp Yoga đón bình minh bên bờ cát mỗi sáng với huấn luyện viên.',
    IconName: 'fitness_center'
  },
  {
    AmenityId: 6,
    AmenityName: 'Du Thuyền Hoàng Hôn VIP',
    Description: 'Tour ngắm hoàng hôn vịnh biển trên du thuyền tư nhân, tiệc trà chiều canapé và rượu vang thượng hạng.',
    IconName: 'sailing'
  },
  {
    AmenityId: 7,
    AmenityName: 'Đưa Đón Sân Bay Bằng Limousine',
    Description: 'Đội xe Mercedes & Limousine sang trọng đón rước quý khách từ sân bay về resort với wifi và nước uống.',
    IconName: 'airport_shuttle'
  },
  {
    AmenityId: 8,
    AmenityName: 'Dịch Vụ Quản Gia Riêng 24/7',
    Description: 'Chuẩn mực chăm sóc tận tâm đến từng chi tiết cá nhân hóa theo mọi lịch trình của thượng khách.',
    IconName: 'concierge'
  }
];

export const mockSpecialOffers = [
  {
    OfferId: 1,
    Title: 'Ưu Đãi Đặt Sớm (Early Bird 2026)',
    Subtitle: 'Tiết kiệm đến 25% khi đặt phòng trước 30 ngày',
    DiscountText: 'Giảm 25%',
    Description: 'Tận hưởng kỳ nghỉ trong mơ với mức giá ưu đãi nhất kèm miễn phí bữa sáng buffet hàng ngày và trà chiều bãi biển.',
    ExpiryDate: 'Áp dụng quanh năm',
    Badge: 'Phổ biến nhất'
  },
  {
    OfferId: 2,
    Title: 'Kỳ Nghỉ Trăng Mật Thiên Đường',
    Subtitle: 'Dành riêng cho các cặp đôi lãng mạn',
    DiscountText: 'Gói Ưu Đãi VIP',
    Description: 'Tặng bữa tối lãng mạn bên nến tại bờ biển, 60 phút trị liệu đôi tại Spa và 1 chai sâm banh ướp lạnh trong phòng.',
    ExpiryDate: 'Áp dụng cho booking từ 2 đêm',
    Badge: 'Dành cho Cặp đôi'
  },
  {
    OfferId: 3,
    Title: 'Trọn Gói Nghỉ Dưỡng Gia Đình',
    Subtitle: 'Miễn phí cho 2 trẻ em dưới 12 tuổi',
    DiscountText: 'Tiết kiệm 30%',
    Description: 'Miễn phí ăn sáng và giường phụ cho trẻ em, miễn phí vé tham gia Kid Club cả ngày và xe đưa đón sân bay 2 chiều.',
    ExpiryDate: 'Hạn đến 31/12/2026',
    Badge: 'Gia đình'
  }
];

export const mockReviews = [
  {
    ReviewId: 1,
    ReviewerName: 'TS. Trần Hoàng & Phu Nhân',
    TripClassification: 'Kỳ Nghỉ Thượng Lưu',
    OverallRating: 5.0,
    ReviewDate: 'Tháng 9, 2026',
    ReviewTitle: 'Kỳ nghỉ hoàn hảo đến từng chi tiết nhỏ nhất',
    ReviewBody: 'Đội ngũ concierge của Grand Horizon thấu hiểu từng mong muốn của gia đình tôi. Hồ bơi riêng tại Executive Villa nhìn thẳng hoàng hôn tuyệt mỹ. Ẩm thực tại The Azure thật sự xứng tầm 5 sao quốc tế.'
  },
  {
    ReviewId: 2,
    ReviewerName: 'Madame Mai Lan',
    TripClassification: 'Hội Viên Grand Horizon Elite',
    OverallRating: 5.0,
    ReviewDate: 'Tháng 8, 2026',
    ReviewTitle: 'Đẳng cấp dịch vụ vượt ngoài mong đợi',
    ReviewBody: 'Kiến trúc sang trọng hòa quyện cùng bờ biển ngọc lam nguyên sơ. Quản gia riêng luôn chu đáo trước mọi yêu cầu. Chắc chắn tôi sẽ quay lại Grand Horizon trong mọi chuyến công tác và nghỉ dưỡng tiếp theo.'
  },
  {
    ReviewId: 3,
    ReviewerName: 'Gia Đình Anh Tuấn & Chị Hà',
    TripClassification: 'Kỳ Nghỉ Gia Đình Hạnh Phúc',
    OverallRating: 5.0,
    ReviewDate: 'Tháng 8, 2026',
    ReviewTitle: 'Các con tôi mê tít Kid Club và bãi biển cát trắng',
    ReviewBody: 'Family Garden Villa rất rộng rãi và yên tĩnh, hai bé nhà mình thỏa sức vui chơi an toàn. Nhân viên luôn nở nụ cười ấm áp và thân thiện. Dịch vụ đưa đón sân bay rất đúng giờ và êm ái.'
  },
  {
    ReviewId: 4,
    ReviewerName: 'David & Sarah Miller',
    TripClassification: 'Khách Quốc Tế (Kỷ niệm Ngày Cưới)',
    OverallRating: 5.0,
    ReviewDate: 'Tháng 7, 2026',
    ReviewTitle: 'An unforgettable anniversary experience',
    ReviewBody: 'The Sunset Overwater Bungalow exceeded all our dreams. Waking up to turquoise waters right beneath us and enjoying the private candlelit beach dinner was pure magic. Truly world-class hospitality.'
  }
];

export const mockFaqs = [
  {
    id: 1,
    question: 'Thời gian nhận phòng (Check-in) và trả phòng (Check-out) là khi nào?',
    answer: 'Giờ nhận phòng tiêu chuẩn là từ 14:00 và giờ trả phòng trước 12:00 trưa. Khách sạn hỗ trợ nhận phòng sớm hoặc trả phòng trễ tùy thuộc vào tình trạng phòng thực tế tại thời điểm lưu trú (hội viên Elite được ưu tiên miễn phí đến 14:00).'
  },
  {
    id: 2,
    question: 'Giá phòng đã bao gồm bữa sáng và các loại thuế phí chưa?',
    answer: 'Tất cả giá phòng niêm yết tại Grand Horizon Hotels & Resorts đã bao gồm bữa sáng buffet quốc tế hàng ngày cho số lượng khách tiêu chuẩn của phòng, 8% thuế VAT và 5% phí phục vụ, không có phụ phí ẩn.'
  },
  {
    id: 3,
    question: 'Khách sạn có dịch vụ đưa đón sân bay không?',
    answer: 'Có. Khách sạn cung cấp dịch vụ đưa đón sân bay bằng xe Limousine cao cấp. Đối với các hạng phòng Executive Beachfront Villa và Presidential Penthouse, dịch vụ đưa đón sân bay 2 chiều được phục vụ hoàn toàn miễn phí.'
  },
  {
    id: 4,
    question: 'Chính sách hoàn hủy đặt phòng như thế nào?',
    answer: 'Quý khách có thể hủy hoặc thay đổi ngày lưu trú miễn phí trước 48 giờ so với ngày nhận phòng. Với các chương trình khuyến mãi không hoàn tiền, quý khách có thể liên hệ bộ phận hỗ trợ 1900 6868 để được bảo lưu booking trong vòng 12 tháng.'
  },
  {
    id: 5,
    question: 'Chính sách dành cho trẻ em khi ở cùng bố mẹ?',
    answer: 'Tối đa 1 trẻ em dưới 6 tuổi được miễn phí hoàn toàn khi ngủ chung giường với bố mẹ và miễn phí ăn sáng. Trẻ em từ 6 đến 11 tuổi phụ thu bữa sáng 250.000₫/ngày hoặc đặt thêm giường phụ với phụ phí ưu đãi.'
  }
];

export const mockStats = {
  avgRating: 4.95,
  totalBookings: 125400,
  totalRooms: 550,
  totalBranches: 4,
  returnRate: '99.2%'
};
