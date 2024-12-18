function chunkText(text, chunkSize = 100, overlapSize = 20) {
  const words = text.trim().split(/\s+/);
  const chunks = [];
  
  for (let i = 0; i < words.length; i += chunkSize - overlapSize) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.length >= 30) { // Minimum chunk size threshold
      chunks.push(chunk);
    }
  }
  
  return chunks;
}

module.exports = { chunkText };
