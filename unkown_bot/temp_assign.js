function assignEmojis() {
  const pool = Array.isArray(window.EMOJI_POOL) ? window.EMOJI_POOL : [];
  const uniquePool = [...new Set(pool)];
  if (uniquePool.length < GRID_SIZE * GRID_SIZE) {
    console.warn('Emoji pool is too small; duplicates may occur.');
  }
  const shuffled = shuffle([...uniquePool]);
  cellEmojis = shuffled.slice(0, GRID_SIZE * GRID_SIZE);
}
