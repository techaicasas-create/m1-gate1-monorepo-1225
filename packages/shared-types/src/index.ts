export type Money = {
  currency: string; // e.g. "EUR"
  amount: string;   // 建议用 string（避免浮点误差），与防呆清单保持一致
};
