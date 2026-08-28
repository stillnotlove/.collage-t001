import { NextResponse } from "next/server";

export const runtime = "nodejs";

function isPrivateHostname(hostname) {
  const h = hostname.toLowerCase();

  if (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "::1" ||
    h.endsWith(".local")
  ) return true;

  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = m.slice(1).map(Number);
    if (a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }

  return false;
}

export async function GET(request) {
  const raw = request.nextUrl.searchParams.get("url");
  if (!raw) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  let url;
  try { url = new URL(raw); }
  catch { return NextResponse.json({ error: "Invalid url" }, { status: 400 }); }

  if (!["http:", "https:"].includes(url.protocol))
    return NextResponse.json({ error: "Unsupported protocol" }, { status: 400 });

  if (isPrivateHostname(url.hostname))
    return NextResponse.json({ error: "Private hosts are blocked" }, { status: 403 });

  try {
    const upstream = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent": "CollageTool/0.2",
        "Accept": "image/avif,image/webp,image/png,image/jpeg,image/gif,*/*"
      }
    });

    if (!upstream.ok)
      return NextResponse.json({ error: `Upstream ${upstream.status}` }, { status: 502 });

    const type = upstream.headers.get("content-type") || "";
    if (!type.startsWith("image/"))
      return NextResponse.json({ error: "Not an image" }, { status: 415 });

    const body = await upstream.arrayBuffer();
    if (body.byteLength > 15 * 1024 * 1024)
      return NextResponse.json({ error: "Image too large" }, { status: 413 });

    return new NextResponse(body, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch {
    return NextResponse.json({ error: "Proxy failed" }, { status: 502 });
  }
}
