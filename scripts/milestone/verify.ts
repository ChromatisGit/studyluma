import { strict as assert } from "node:assert";
import { createBunRuntime } from "@chromatis/base/runtime";
import { readSecret } from "@chromatis/base/secrets";
import {
  adminPinSecret,
  outsiderPinSecret,
  studentPinSecret,
} from "../../src/app/config/secrets";
import { getWebsiteConfig } from "../../src/app/config";

const baseUrl = process.env.STUDYLUMA_URL;
const secrets = createBunRuntime({ ...process.env, NODE_ENV: "local" }).secrets;
const users = [
  {
    name: process.env.SEED_ADMIN_USER,
    pin: readSecret(adminPinSecret, secrets),
  },
  {
    name: process.env.SEED_STUDENT_USER,
    pin: readSecret(studentPinSecret, secrets),
  },
  {
    name: process.env.SEED_OUTSIDER_USER,
    pin: readSecret(outsiderPinSecret, secrets),
  },
];
if (!baseUrl || users.some((user) => !user.name || !user.pin)) {
  throw new Error(
    "STUDYLUMA_URL and all three SEED_*_USER/SEED_*_PIN pairs are required",
  );
}

const origin = new URL(baseUrl);
if (!["localhost", "127.0.0.1", "::1"].includes(origin.hostname)) {
  throw new Error("Milestone verification is restricted to a local Website");
}

const coursePath = "/courses/math-demo";
const worksheetPath = "/w/7fb7f81d-96b9-4d2b-b614-b7402ece81a3";
const teacherPath = `${coursePath}/teacher`;
const chapterPath =
  `${coursePath}/topics/binomische-formeln/chapters/binomische-formeln-einstieg`;
const worksheetId = "binomische-formeln-erste-uebung";

async function login(name: string, pin: string): Promise<string> {
  const form = new URLSearchParams({ username: name, pin });
  const response = await fetch(new URL("/login", origin), {
    method: "POST",
    body: form,
    redirect: "manual",
  });
  assert.equal(response.status, 302, `${name} login must redirect`);
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(
    cookie?.startsWith(`${getWebsiteConfig("local").sessionCookieName}=`),
    `${name} must receive a session`,
  );
  if (!cookie) {
    throw new Error(`${name} did not receive a session cookie`);
  }
  return cookie;
}

async function request(
  path: string,
  cookie: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(new URL(path, origin), {
    ...init,
    headers: { ...init?.headers, Cookie: cookie },
    redirect: "manual",
  });
}

const [admin, student, outsider] = await Promise.all(
  users.map((user) => {
    if (!user.name || !user.pin) {
      throw new Error("A verification user is missing credentials");
    }
    return login(user.name, user.pin);
  }),
);
assert.ok(admin && student && outsider, "all three sessions must exist");
assert.equal(
  (await request(coursePath, admin)).status,
  200,
  "admin course access",
);
assert.equal(
  (await request(coursePath, student)).status,
  200,
  "student course access",
);
assert.equal(
  (await request(coursePath, outsider)).status,
  404,
  "outsider course denial",
);
assert.equal(
  (await request(worksheetPath, outsider)).status,
  404,
  "outsider worksheet denial",
);
assert.equal(
  (await fetch(new URL(coursePath, origin), { redirect: "manual" })).status,
  302,
  "normal Website course access requires login",
);
assert.equal(
  (await fetch(new URL(teacherPath, origin), { redirect: "manual" })).status,
  302,
  "teacher dashboard requires login",
);
assert.equal(
  (await request(teacherPath, student)).status,
  403,
  "student cannot open teacher dashboard",
);
assert.equal(
  (await request(teacherPath, student, {
    method: "POST",
    body: new URLSearchParams({ chapterId: "binomische-formeln-einstieg" }),
  })).status,
  403,
  "student cannot change current chapter",
);
assert.equal(
  (await fetch(new URL("/api/publish", origin), {
    method: "POST",
    body: "{}",
  })).status,
  401,
  "publishing requires its token",
);

const setChapter = await request(teacherPath, admin, {
  method: "POST",
  body: new URLSearchParams({ chapterId: "binomische-formeln-einstieg" }),
});
assert.equal(setChapter.status, 303, "teacher can set current chapter");
assert.ok(
  (await (await request(coursePath, student)).text()).includes(
    "Aktuelles Kapitel",
  ),
  "student course shows persisted current chapter",
);
assert.ok(
  (await (await request(chapterPath, student)).text()).includes(
    "Aktuelles Kapitel",
  ),
  "student chapter shows persisted current chapter",
);
assert.ok(
  (await (await request(teacherPath, admin)).text()).includes("Aktuell"),
  "teacher dashboard reload shows current chapter",
);
assert.equal(
  (await request(teacherPath, admin, {
    method: "POST",
    body: new URLSearchParams({ chapterId: "not-in-course" }),
  })).status,
  400,
  "teacher cannot select a chapter outside the course",
);
assert.equal(
  (await request(teacherPath, admin, {
    method: "POST",
    body: new URLSearchParams({ worksheetId, locked: "false" }),
  })).status,
  303,
  "worksheet starts unlocked for response check",
);

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
assert.ok(
  (await reloaded.text()).includes(answer),
  "saved answer must survive a new request",
);

try {
  const locked = await request(teacherPath, admin, {
    method: "POST",
    body: new URLSearchParams({ worksheetId, locked: "true" }),
  });
  assert.equal(locked.status, 303, "teacher can lock worksheet");
  assert.ok(
    (await (await request(teacherPath, admin)).text()).includes("Gesperrt"),
    "lock survives teacher navigation and reload",
  );
  assert.ok(
    (await (await request(chapterPath, student)).text()).includes("Gesperrt"),
    "student chapter shows lock",
  );
  assert.ok(
    (await (await request(worksheetPath, student)).text()).includes(
      "Dieses Arbeitsblatt ist gesperrt",
    ),
    "student worksheet cannot be worked on while locked",
  );
  assert.equal(
    (await request(worksheetPath, student, {
      method: "POST",
      body: new URLSearchParams({ answer: "blocked" }),
    })).status,
    403,
    "direct student save is blocked while locked",
  );
} finally {
  assert.equal(
    (await request(teacherPath, admin, {
      method: "POST",
      body: new URLSearchParams({ worksheetId, locked: "false" }),
    })).status,
    303,
    "teacher can unlock worksheet",
  );
}
assert.ok(
  (await (await request(teacherPath, admin)).text()).includes("Freigegeben"),
  "unlock survives teacher reload",
);
assert.ok(
  (await (await request(worksheetPath, student)).text()).includes(answer),
  "student can work on worksheet again after unlock",
);

console.log(
  "Milestone verified: teacher controls, student effects, authentication, publishing protection, response persistence",
);
