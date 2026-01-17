const adminUserData = {
  users: {
    umkh56vwo: {
      user: {
        id: "umkh56vwo",
        role: "admin",
      },
      credentials: {
        accessCode: "0001",
        pinHash:
          "2d9b6990133e8534b51fa63e0e1bee32484a2a9f0a28d4b176620ecf4161e00b01e7d7f75f33b35b29508a405ece35b027ee8809512c38e527ef4bda3e708eac",
        salt: "03e96e5b09e57c675a2b5c2d166c7609584858e393e8170022d8f7ad98200ca0",
      },
    },
  },
  accessCodeIndex: {
    "0001": "umkh56vwo",
  },
};

const WEBSITE_ROOT = normalizeSlashes(`${import.meta.dir}/../..`);
const DATA_PATH = joinPath(WEBSITE_ROOT, ".data");
const targetPath = joinPath(DATA_PATH, "users/users.json");

void Bun.write(targetPath, `${JSON.stringify(adminUserData, null, 2)}\n`, {
  createPath: true,
});
console.log("Wrote .data/users/users.json");

function joinPath(...parts: string[]): string {
  const raw = parts.map(normalizeSlashes).join("/");
  const cleaned = raw.replace(/\/{2,}/g, "/");
  return raw.startsWith("//") ? `/${cleaned}` : cleaned;
}

function normalizeSlashes(input: string): string {
  return input.replace(/\\/g, "/");
}
