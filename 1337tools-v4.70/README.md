# 1337tools v4.70

Vercel Analytics tool-usage events.

## What changed
- kept global Vercel Web Analytics from v4.69
- added one custom event: `tool_open`
- event fires whenever FIELD, SLICE, ASCII, ECHO or EDITOR is opened
- each event contains a `tool` property with the tool name
- entries are counted whether the tool is opened from the catalog or reached through CONTINUE
- no visual or tool behavior changes

## Analytics
In Vercel Web Analytics, compare the `tool_open` event grouped by the `tool` property to see which tools are used most often.
