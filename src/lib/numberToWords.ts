const ones = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen"
];

const tens = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
];

const scales = ["", "Thousand", "Lakh", "Crore"];

function convertToWords(num: number): string {
  if (num === 0) return "";
  
  if (num < 20) return ones[num];
  
  if (num < 100) {
    return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? " " + ones[num % 10] : "");
  }
  
  if (num < 1000) {
    return ones[Math.floor(num / 100)] + " Hundred" + 
           (num % 100 !== 0 ? " " + convertToWords(num % 100) : "");
  }
  
  return "";
}

export function numberToWords(amount: number): string {
  if (amount === 0) return "Zero Rupees Only";
  
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  
  if (rupees === 0 && paise > 0) {
    return convertToWords(paise) + " Paise Only";
  }
  
  // Indian numbering system: Crore, Lakh, Thousand, Hundred
  let result = "";
  
  // Handle crores (1,00,00,000)
  if (rupees >= 10000000) {
    result += convertToWords(Math.floor(rupees / 10000000)) + " Crore ";
  }
  
  // Handle lakhs (1,00,000)
  const afterCrore = rupees % 10000000;
  if (afterCrore >= 100000) {
    result += convertToWords(Math.floor(afterCrore / 100000)) + " Lakh ";
  }
  
  // Handle thousands (1,000)
  const afterLakh = afterCrore % 100000;
  if (afterLakh >= 1000) {
    result += convertToWords(Math.floor(afterLakh / 1000)) + " Thousand ";
  }
  
  // Handle hundreds and below
  const remaining = afterLakh % 1000;
  if (remaining > 0) {
    result += convertToWords(remaining);
  }
  
  result = result.trim() + " Rupees";
  
  if (paise > 0) {
    result += " and " + convertToWords(paise) + " Paise";
  }
  
  return result + " Only";
}
