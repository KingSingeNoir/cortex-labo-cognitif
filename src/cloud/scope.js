let accountId = null;

export function setActiveAccountId(id) {
  accountId = id || null;
}

export function getActiveAccountId() {
  return accountId;
}

export function scopedKey(base) {
  return accountId ? `${base}::${accountId}` : base;
}
