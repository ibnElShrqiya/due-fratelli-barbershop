export async function onRequestPost(context) {
  const origin = context.request.headers.get("Origin");
  const allowedOrigin = "https://due-fratelli-barbershop.pages.dev";

  if (origin && origin !== allowedOrigin) {
    return json({ error: "Forbidden origin" }, 403);
  }

  let booking;
  try {
    booking = await context.request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const name = clean(booking?.name, 80);
  const phone = clean(booking?.phone, 40);
  const service = clean(booking?.service, 120);
  const date = clean(booking?.date, 20);
  const time = clean(booking?.time, 10);

  if (!name || !phone || !service || !date || !time) {
    return json({ error: "Missing booking fields" }, 400);
  }

  if (!context.env.ONESIGNAL_REST_API_KEY) {
    return json({ error: "OneSignal secret is not configured" }, 500);
  }

  const body = `${name} · ${date} ${time} · ${service}`;
  const response = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Authorization": `Key ${context.env.ONESIGNAL_REST_API_KEY}`
    },
    body: JSON.stringify({
      app_id: "71a26ce3-89a9-4e1d-be11-626d62fb72d1",
      target_channel: "push",
      include_aliases: { external_id: ["UaeCgppTSwVNou3QuEGZdfDiOet1"] },
      headings: { en: "DUE FRATELLI — New booking", ar: "DUE FRATELLI — حجز جديد" },
      contents: { en: body, ar: body },
      url: "https://due-fratelli-barbershop.pages.dev/admin.html"
    })
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("OneSignal error", response.status, result);
    return json({ error: "Notification provider rejected the request" }, 502);
  }

  return json({ ok: true, id: result.id ?? null });
}

function clean(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}
