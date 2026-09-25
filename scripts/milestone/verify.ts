import { strict as assert } from "node:assert";

const baseUrl = process.env.STUDYLUMA_URL;
const users = [
  { name: process.env.SEED_ADMIN_USER, pin: process.env.SEED_ADMIN_PIN },
  { name: process.env.SEED_STUDENT_USER, pin: process.env.SEED_STUDENT_PIN },
  { name: process.env.SEED_OUTSIDER_USER, pin: process.env.SEED_OUTSIDER_PIN },
];
if (!baseUrl || users.some(user => !user.name || !user.pin)) {
  throw new Error("STUDYLUMA_URL and all three SEED_*_USER/SEED_*_PIN pairs are required");
}

const origin = new URL(baseUrl);
if (!["localhost", "127.0.0.1", "::1"].includes(origin.hostname)) {
  throw new Error("Milestone verification is restricted to a local Website");
}

const coursePath = "/courses/math-demo";
const worksheetPath = "/w/7fb7f81d-96b9-4d2b-b614-b7402ece81a3";

async function login(name: string, pin: string): Promise<string> {
  const form = new URLSearchParams({ username: name, pin });
  const response = await fetch(new URL("/login", origin), {
    method: "POST",
    body: form,
    redirect: "manual",
  });
  assert.equal(response.status, 302, `${name} login must redirect`);
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie?.startsWith("studyluma-session="), `${name} must receive a session`);
  return cookie!;
}

async function request(path: string, cookie: string, init?: RequestInit): Promise<Response> {
  return fetch(new URL(path, origin), {
    ...init,
    headers: { ...init?.headers, Cookie: cookie },
    redirect: "manual",
  });
}

const [admin, student, outsider] = await Promise.all(users.map(user => login(user.name!, user.pin!)));
assert.ok(admin && student && outsider, "all three sessions must exist");
assert.equal((await request(coursePath, admin)).status, 200, "admin course access");
assert.equal((await request(coursePath, student)).status, 200, "student course access");
assert.equal((await request(coursePath, outsider)).status, 404, "outsider course denial");
assert.equal((await request(worksheetPath, outsider)).status, 404, "outsider worksheet denial");

const worksheet = await request(worksheetPath, student);
assert.equal(worksheet.status, 200, "student worksheet access");
const answer = `Milestone verification ${crypto.randomUUID()}`;
const saved = await request(worksheetPath, student, {
  method: "POST",
  body: new URLSearchParams({ answer }),
});
assert.equal(saved.status, 200, "student response save");
const reloaded = await request(worksheetPath, student);
assert.equal(reloaded.status, 200, "student response reload");
assert.ok((await reloaded.text()).includes(answer), "saved answer must survive a new request");

console.log("Milestone verified: admin and student access, outsider denial, response persistence");
