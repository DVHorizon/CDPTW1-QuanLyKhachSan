/**
 * Các quy tắc và logic xử lý Hội viên & Khách hàng thân thiết
 */

export const LOYALTY_TIERS = {
  BRONZE: 'Classic Blue',
  SILVER: 'Silver Resident',
  GOLD: 'Gold Elite',
  DIAMOND: 'Black Lotus VIP',
};

// Cấu hình điểm lên hạng
export const TIER_THRESHOLDS = {
  [LOYALTY_TIERS.BRONZE]: 0,
  [LOYALTY_TIERS.SILVER]: 15000,
  [LOYALTY_TIERS.GOLD]: 40000,
  [LOYALTY_TIERS.DIAMOND]: 100000,
};

// Cấu hình chiết khấu khi đặt phòng dựa trên hạng
export const TIER_DISCOUNTS = {
  [LOYALTY_TIERS.BRONZE]: 0.0, // 0%
  [LOYALTY_TIERS.SILVER]: 0.05, // 5%
  [LOYALTY_TIERS.GOLD]: 0.10, // 10%
  [LOYALTY_TIERS.DIAMOND]: 0.15, // 15%
};

// Tỷ lệ quy đổi điểm (Ví dụ: 10,000 VNĐ = 1 điểm)
export const POINT_CONVERSION_RATE = 10000;

// Hệ số nhân điểm theo hạng (Hạng càng cao, tích điểm càng nhanh)
export const TIER_POINT_MULTIPLIER = {
  [LOYALTY_TIERS.BRONZE]: 1.0,
  [LOYALTY_TIERS.SILVER]: 1.25,
  [LOYALTY_TIERS.GOLD]: 1.5,
  [LOYALTY_TIERS.DIAMOND]: 2.0,
};

export const calculateEarnedPoints = (amount, currentTier = LOYALTY_TIERS.BRONZE) => {
  if (!amount || amount <= 0) return 0;

  const basePoints = Math.floor(amount / POINT_CONVERSION_RATE);
  const multiplier = TIER_POINT_MULTIPLIER[currentTier] || 1.0;

  return Math.floor(basePoints * multiplier);
};

export const evaluateTier = (totalAccumulatedPoints) => {
  if (totalAccumulatedPoints >= TIER_THRESHOLDS[LOYALTY_TIERS.DIAMOND]) {
    return LOYALTY_TIERS.DIAMOND;
  }
  if (totalAccumulatedPoints >= TIER_THRESHOLDS[LOYALTY_TIERS.GOLD]) {
    return LOYALTY_TIERS.GOLD;
  }
  if (totalAccumulatedPoints >= TIER_THRESHOLDS[LOYALTY_TIERS.SILVER]) {
    return LOYALTY_TIERS.SILVER;
  }
  return LOYALTY_TIERS.BRONZE;
};

export const processTransaction = (member, spendAmount, transactionType = 'STAY') => {
  const earnedPoints = calculateEarnedPoints(spendAmount, member.tier);

  const newCurrentPoints = (member.currentPoints || 0) + earnedPoints;
  const newLifetimePoints = (member.lifetimePoints || 0) + earnedPoints;

  const newTier = evaluateTier(newLifetimePoints);

  const isUpgraded = newTier !== member.tier &&
    TIER_THRESHOLDS[newTier] > TIER_THRESHOLDS[member.tier];

  return {
    updatedMember: {
      ...member,
      tier: newTier,
      currentPoints: newCurrentPoints,
      lifetimePoints: newLifetimePoints,
    },
    transactionLog: {
      type: transactionType,
      amount: spendAmount,
      pointsEarned: earnedPoints,
      tierBefore: member.tier,
      tierAfter: newTier,
      isUpgraded,
      timestamp: new Date().toISOString()
    }
  };
};

export const calculateBookingPrice = (originalPrice, tier) => {
  const discountRate = TIER_DISCOUNTS[tier] || 0;
  const discountAmount = originalPrice * discountRate;
  const finalPrice = originalPrice - discountAmount;

  return {
    originalPrice,
    finalPrice,
    discountAmount,
    discountRate: discountRate * 100
  };
};
