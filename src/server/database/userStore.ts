import "server-only";
import { writeFile, readFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomBytes, pbkdf2 } from "crypto";
import { promisify } from "util";
import type { User, DefaultUser } from "@/domain/userTypes";

const pbkdf2Async = promisify(pbkdf2);

// Security constants
const HASH_ITERATIONS = 100000;
const HASH_KEY_LENGTH = 64;
const HASH_ALGORITHM = "sha512";
const SALT_LENGTH = 32;

type UserCredentials = {
  accessCode: string;
  pinHash: string;
  salt: string;
};

type StoredUser = {
  user: User;
  credentials: UserCredentials;
};

type UserDatabase = {
  users: Record<string, StoredUser>; // userId -> StoredUser
  accessCodeIndex: Record<string, string>; // accessCode -> userId
};

const USER_DIR = join(process.cwd(), ".data", "users");
const USER_FILE = join(USER_DIR, "users.json");

// In-memory cache
let userCache: UserDatabase | null = null;

async function ensureUserDir() {
  try {
    await mkdir(USER_DIR, { recursive: true });
  } catch {
    // Directory already exists
  }
}

async function loadUsersFromFile(): Promise<UserDatabase> {
  try {
    const content = await readFile(USER_FILE, "utf-8");
    return JSON.parse(content) as UserDatabase;
  } catch {
    // File doesn't exist yet, return empty database
    return {
      users: {},
      accessCodeIndex: {},
    };
  }
}

async function saveUsersToFile(db: UserDatabase): Promise<void> {
  await ensureUserDir();
  await writeFile(USER_FILE, JSON.stringify(db, null, 2), "utf-8");
}

export async function getUserDatabase(): Promise<UserDatabase> {
  if (!userCache) {
    userCache = await loadUsersFromFile();
  }
  return userCache;
}

/**
 * Generate a cryptographically secure salt
 */
function generateSalt(): string {
  return randomBytes(SALT_LENGTH).toString("hex");
}

/**
 * Generate a random access code (4 digits)
 */
export function generateAccessCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Hash a PIN with a salt using PBKDF2
 */
export async function hashPin(pin: string, salt: string): Promise<string> {
  const buffer = await pbkdf2Async(
    pin,
    salt,
    HASH_ITERATIONS,
    HASH_KEY_LENGTH,
    HASH_ALGORITHM
  );
  return buffer.toString("hex");
}

/**
 * Verify a PIN against a hash and salt
 */
export async function verifyPin(
  pin: string,
  hash: string,
  salt: string
): Promise<boolean> {
  const computedHash = await hashPin(pin, salt);
  return computedHash === hash;
}

/**
 * Get a user by their ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  const db = await getUserDatabase();
  return db.users[userId]?.user ?? null;
}

/**
 * Get a user by their access code
 */
export async function getUserByAccessCode(accessCode: string): Promise<User | null> {
  const db = await getUserDatabase();
  const userId = db.accessCodeIndex[accessCode];
  if (!userId) return null;
  return db.users[userId]?.user ?? null;
}

/**
 * Find a user by PIN (searches through all users)
 * Returns the user if found, null otherwise
 */
export async function findUserByPin(pin: string): Promise<User | null> {
  const db = await getUserDatabase();

  for (const [, storedUser] of Object.entries(db.users)) {
    const isValid = await verifyPin(
      pin,
      storedUser.credentials.pinHash,
      storedUser.credentials.salt
    );
    if (isValid) {
      return storedUser.user;
    }
  }

  return null;
}

/**
 * Authenticate a user with access code and PIN
 */
export async function authenticateUser(
  accessCode: string,
  pin: string
): Promise<User | null> {
  const db = await getUserDatabase();
  const userId = db.accessCodeIndex[accessCode];

  if (!userId) return null;

  const storedUser = db.users[userId];
  if (!storedUser) return null;

  const isValid = await verifyPin(
    pin,
    storedUser.credentials.pinHash,
    storedUser.credentials.salt
  );

  return isValid ? storedUser.user : null;
}

/**
 * Create a new user with hashed credentials
 */
export async function createUser(
  user: User,
  pin: string,
  accessCode?: string
): Promise<void> {
  userCache = null; // Clear cache

  const db = await getUserDatabase();

  // Generate access code if not provided
  const finalAccessCode = accessCode ?? generateAccessCode();

  // Check if access code already exists
  if (db.accessCodeIndex[finalAccessCode]) {
    throw new Error("Access code already exists");
  }

  // Generate salt and hash PIN
  const salt = generateSalt();
  const pinHash = await hashPin(pin, salt);

  // Store user
  db.users[user.id] = {
    user,
    credentials: {
      accessCode: finalAccessCode,
      pinHash,
      salt,
    },
  };

  // Update index
  db.accessCodeIndex[finalAccessCode] = user.id;

  await saveUsersToFile(db);
  userCache = null; // Clear cache again
}

/**
 * Update a user's data (not credentials)
 */
export async function updateUser(userId: string, updates: Partial<User>): Promise<void> {
  userCache = null; // Clear cache

  const db = await getUserDatabase();
  const storedUser = db.users[userId];

  if (!storedUser) {
    throw new Error("User not found");
  }

  // Merge updates while preserving the correct type
  const currentUser = storedUser.user;
  let updatedUser: User;

  if (currentUser.role === "admin") {
    // Admin users have a simpler structure
    updatedUser = {
      id: userId,
      role: "admin",
    };
  } else {
    // Default users with groupKey and courseIds
    updatedUser = {
      ...currentUser,
      ...updates,
      id: userId, // Ensure ID doesn't change
      role: "user", // Ensure role doesn't change to admin
    } as DefaultUser;
  }

  db.users[userId] = {
    ...storedUser,
    user: updatedUser,
  };

  await saveUsersToFile(db);
  userCache = null; // Clear cache again
}

/**
 * Add a course to a user's course list
 */
export async function addCourseToUser(userId: string, courseId: string): Promise<void> {
  const db = await getUserDatabase();
  const storedUser = db.users[userId];

  if (!storedUser) {
    throw new Error("User not found");
  }

  const user = storedUser.user;

  // Only default users have courseIds
  if (user.role !== "user") {
    return; // Admins don't need course additions
  }

  if (!user.courseIds.includes(courseId)) {
    user.courseIds.push(courseId);
    await updateUser(userId, user);
  }
}

/**
 * Get a user's access code
 */
export async function getUserAccessCode(userId: string): Promise<string | null> {
  const db = await getUserDatabase();
  return db.users[userId]?.credentials.accessCode ?? null;
}

/**
 * Get all users (admin only - for listing)
 */
export async function getAllUsers(): Promise<User[]> {
  const db = await getUserDatabase();
  return Object.values(db.users).map((stored) => stored.user);
}
