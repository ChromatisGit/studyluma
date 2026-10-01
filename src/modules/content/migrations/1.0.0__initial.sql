CREATE TABLE topics (
  id text PRIMARY KEY,
  title text NOT NULL
);
CREATE TABLE chapters (
  id text PRIMARY KEY,
  topic_id text NOT NULL REFERENCES topics(id),
  title text NOT NULL,
  body text NOT NULL
);

REVOKE ALL ON topics, chapters FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON topics, chapters TO chromatis_app;
