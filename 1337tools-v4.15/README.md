# 1337tools v4.15

Focus of this update:
- ASCII tool fit/render cleanup
- RAW / STRAIGHT style switch in ASCII
- CONTINUE flow between tools
- process trail shown in tool headers

## Changes

### ASCII
- fixed preview rendering so the empty stage no longer opens with accidental blue-strip artifacts
- image fitting now uses proportional contain logic inside the canvas area to avoid squeezed imports
- added `Style` switch: `RAW` and `STRAIGHT`
- preview and export now use the same rendering base logic

### Process flow
- added `CONTINUE` action in FIELD / SLICE / ASCII
- you can pass the current rendered result forward to the next tool
- supported targets: FIELD, SLICE, ASCII, EDITOR
- header now shows the current path, for example `FIELD → ASCII → EDITOR`

### Version
- UI version bumped to 4.15
