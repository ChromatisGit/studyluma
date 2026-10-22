# probe

The Development instance's test component. It runs every path of the component mechanism: own keys and the Grafik blocks, its own errors and warnings, text (`::komponente`) and slide (`::komponentenfolie`), and state the projector mirrors.

It shows the one `[[graph]]` of its file and a point P on it; the buttons move P by one in x.

```toml
start = 1          # where P starts, a whole number (default 0)

[achsen]
x = [-4, 4]
y = [-2, 10]

[[graph]]
term = "y = x^2"
```

| Code                    | Meaning                                      |
| ----------------------- | -------------------------------------------- |
| `PROBE_START` (error)   | `start` is not a whole number                |
| `PROBE_GRAPH` (error)   | the file has no or more than one `[[graph]]` |
| `PROBE_RANGE` (warning) | `start` lies outside the x axis              |
