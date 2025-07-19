export const generateReadableOrderId = (): string => {
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');

  const randomPart = Math.floor(Math.random() * 9000) + 1000;

  return `ORD-${datePart}-${randomPart}`;
};
