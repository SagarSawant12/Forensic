import { InvestigationData, ChatRecord, CallRecord, ContactRecord, ImageMetadata, ForensicRecord } from "./types";

// remove simple ampersand-based obfuscation inserted into some input exports
// by certain tools.  this helper is intentionally very dumb and simply strips
// every '&' character; the rest of the codebase then works with clean text.
function decryptText(str: any): string {
  if (typeof str !== "string") return str;
  return str.replace(/&/g, "");
}

export function parseUploadedFile(content: string, filename: string): InvestigationData {
  const ext = filename.split(".").pop()?.toLowerCase();

  if (ext === "json") {
    return parseJSON(content);
  } else if (ext === "xml") {
    return parseXML(content);
  }

  // Try JSON first, then XML
  try {
    return parseJSON(content);
  } catch {
    return parseXML(content);
  }
}

function parseJSON(content: string): InvestigationData {
  const raw = JSON.parse(content);
  const records: ForensicRecord[] = [];



  if (Array.isArray(raw)) {
    for (const item of raw) {
      const record = normalizeRecord(item);
      if (record) records.push(record);
    }
  } else if (raw.data && Array.isArray(raw.data)) {
    for (const item of raw.data) {
      const record = normalizeRecord(item);
      if (record) records.push(record);
    }
  } else if (raw.chats || raw.calls || raw.contacts || raw.images || raw.messages || raw.call_logs || raw.whatsapp_messages || raw.media_files) {
    // Handle sample data format
    if (raw.chats) raw.chats.forEach((c: any) => {
      const r = normalizeRecord({ ...c, type: "chat" });
      if (r) records.push(r);
    });
    if (raw.calls) raw.calls.forEach((c: any) => {
      const r = normalizeRecord({ ...c, type: "call" });
      if (r) records.push(r);
    });
    if (raw.contacts) raw.contacts.forEach((c: any) => {
      const r = normalizeRecord({ ...c, type: "contact" });
      if (r) records.push(r);
    });
    if (raw.images) raw.images.forEach((c: any) => {
      const r = normalizeRecord({ ...c, type: "image" });
      if (r) records.push(r);
    });

    // Handle UFDR format with different field names
    if (raw.messages) raw.messages.forEach((c: any) => {
      const r = normalizeRecord({ ...c, type: "chat" });
      if (r) records.push(r);
    });
    if (raw.call_logs) raw.call_logs.forEach((c: any) => {
      const r = normalizeRecord({ ...c, type: "call" });
      if (r) records.push(r);
    });
    
    // Handle WhatsApp specific format
    if (raw.whatsapp_messages) raw.whatsapp_messages.forEach((c: any) => {
      const r = normalizeRecord({ ...c, type: "chat", platform: "WhatsApp" });
      if (r) records.push(r);
    });
    
    // Handle media files (UFDR format)
    if (raw.media_files) raw.media_files.forEach((c: any) => {
      const r = normalizeRecord({ ...c, type: "image" });
      if (r) records.push(r);
    });
  }

  return categorize(records);
}

function parseXML(content: string): InvestigationData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, "text/xml");
  const records: ForensicRecord[] = [];

  // Try to find record elements
  const elements = doc.querySelectorAll("record, chat, call, contact, image, message, entry, item");

  elements.forEach((el) => {
    const obj: Record<string, string> = {};
    // Get attributes
    Array.from(el.attributes).forEach((attr) => {
      obj[attr.name] = attr.value;
    });
    // Get child elements
    Array.from(el.children).forEach((child) => {
      obj[child.tagName.toLowerCase()] = child.textContent || "";
    });

    if (!obj.type) {
      obj.type = el.tagName.toLowerCase();
      if (["message", "chat"].includes(obj.type)) obj.type = "chat";
      if (["entry", "item"].includes(obj.type)) obj.type = "chat";
    }

    const record = normalizeRecord(obj);
    if (record) records.push(record);
  });

  return categorize(records);
}

function normalizeRecord(item: any): ForensicRecord | null {
  // run every incoming piece of text through our decrypter so that the rest of
  // the app never has to think about any obfuscation that may have been
  // present in the upload.  we modify the object in-place which is fine since
  // the parser only works with a fresh copy of the data.
  for (const key of Object.keys(item)) {
    if (typeof item[key] === "string") {
      item[key] = decryptText(item[key]);
    }
  }

  const type = item.type?.toLowerCase();

  if (type === "chat" || type === "message" || item.message || item.text) {
    return {
      type: "chat",
      from: item.from || item.sender || item.source || "Unknown",
      to: item.to || item.receiver || item.destination || "Unknown",
      message: item.message || item.body || item.text || item.content || "",
      timestamp: item.timestamp || item.date || item.time || "",
      platform: item.platform || item.app || "",
    } as ChatRecord;
  }

  if (type === "call") {
    return {
      type: "call",
      from: item.from || item.caller || item.phone_a || "Unknown",
      to: item.to || item.callee || item.phone_b || "Unknown",
      duration: parseInt(item.duration) || 0,
      timestamp: item.timestamp || item.date || item.call_time || "",
      direction: item.direction || item.call_direction || "outgoing",
    } as CallRecord;
  }

  if (type === "contact") {
    return {
      type: "contact",
      name: item.name || item.displayName || "Unknown",
      phone: item.phone || item.number || item.phoneNumber || "",
      email: item.email || "",
      organization: item.organization || item.org || "",
    } as ContactRecord;
  }

  if (type === "image" || type === "photo" || type === "audio" || type === "video") {
    return {
      type: "image",
      filename: item.filename || item.name || item.file || item.file_name || "unknown",
      timestamp: item.timestamp || item.date || "",
      location: item.lat && item.lng ? { lat: parseFloat(item.lat), lng: parseFloat(item.lng) } : undefined,
      device: item.device || "",
    } as ImageMetadata;
  }

  return null;
}

function categorize(records: ForensicRecord[]): InvestigationData {
  return {
    chats: records.filter((r): r is ChatRecord => r.type === "chat"),
    calls: records.filter((r): r is CallRecord => r.type === "call"),
    contacts: records.filter((r): r is ContactRecord => r.type === "contact"),
    images: records.filter((r): r is ImageMetadata => r.type === "image"),
    rawRecords: records,
  };
}

// Generate sample data for demo
export function generateSampleData(): InvestigationData {
  const chats: ChatRecord[] = [
    { type: "chat", from: "+919876543210", to: "+447890123456", message: "Send the BTC address for the next transfer", timestamp: "2024-02-01T10:30:00Z", platform: "WhatsApp" },
    { type: "chat", from: "+447890123456", to: "+919876543210", message: "Here: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", timestamp: "2024-02-01T10:32:00Z", platform: "WhatsApp" },
    { type: "chat", from: "+919876543210", to: "+971501234567", message: "The hawala transfer is ready. Meet at the usual place.", timestamp: "2024-02-03T14:15:00Z", platform: "Telegram" },
    { type: "chat", from: "+971501234567", to: "+919876543210", message: "Use the burner phone for the next contact", timestamp: "2024-02-03T14:20:00Z", platform: "Telegram" },
    { type: "chat", from: "+919876543210", to: "+861391234567", message: "Can you set up the shell company docs?", timestamp: "2024-02-05T09:00:00Z", platform: "Signal" },
    { type: "chat", from: "+861391234567", to: "+919876543210", message: "Passport copies received. Will process offshore account.", timestamp: "2024-02-05T09:15:00Z", platform: "Signal" },
    { type: "chat", from: "+919876543210", to: "+12125551234", message: "Meeting confirmed for Thursday", timestamp: "2024-02-06T16:00:00Z", platform: "iMessage" },
    { type: "chat", from: "+12125551234", to: "+919876543210", message: "Bring the encrypted USB drive", timestamp: "2024-02-06T16:05:00Z", platform: "iMessage" },
    { type: "chat", from: "+919876543210", to: "+447890123456", message: "Delete all previous messages after reading", timestamp: "2024-02-07T08:00:00Z", platform: "WhatsApp" },
    { type: "chat", from: "+447890123456", to: "+919876543210", message: "Send 0.5 ETH to 0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38", timestamp: "2024-02-08T11:30:00Z", platform: "WhatsApp" },
    { type: "chat", from: "+919876543210", to: "+971501234567", message: "Wire transfer of 50000 USD completed via VPN tunnel", timestamp: "2024-02-09T13:00:00Z", platform: "Telegram" },
    { type: "chat", from: "+919876543210", to: "+12125551234", message: "Everything looks good for the deal. Normal business.", timestamp: "2024-02-10T10:00:00Z", platform: "iMessage" },
  ];

  const calls: CallRecord[] = [
    { type: "call", from: "+919876543210", to: "+447890123456", duration: 342, timestamp: "2024-02-01T09:00:00Z", direction: "outgoing" },
    { type: "call", from: "+971501234567", to: "+919876543210", duration: 120, timestamp: "2024-02-03T13:00:00Z", direction: "incoming" },
    { type: "call", from: "+919876543210", to: "+861391234567", duration: 560, timestamp: "2024-02-05T08:30:00Z", direction: "outgoing" },
    { type: "call", from: "+12125551234", to: "+919876543210", duration: 0, timestamp: "2024-02-06T15:30:00Z", direction: "missed" },
    { type: "call", from: "+919876543210", to: "+447890123456", duration: 180, timestamp: "2024-02-08T10:00:00Z", direction: "outgoing" },
  ];

  const contacts: ContactRecord[] = [
    { type: "contact", name: "Alex M.", phone: "+447890123456", email: "alex.m@protonmail.com" },
    { type: "contact", name: "Omar K.", phone: "+971501234567", organization: "Gulf Trading LLC" },
    { type: "contact", name: "Wei Chen", phone: "+861391234567", organization: "Pacific Ventures" },
    { type: "contact", name: "John Davis", phone: "+12125551234", email: "jdavis@email.com" },
    { type: "contact", name: "Subject A", phone: "+919876543210" },
  ];

  const images: ImageMetadata[] = [
    { type: "image", filename: "IMG_20240201_passport.jpg", timestamp: "2024-02-01T12:00:00Z", device: "Samsung Galaxy S23" },
    { type: "image", filename: "screenshot_wallet.png", timestamp: "2024-02-02T15:00:00Z", device: "Samsung Galaxy S23" },
    { type: "image", filename: "photo_meeting.jpg", timestamp: "2024-02-06T17:00:00Z", location: { lat: 40.7128, lng: -74.006 }, device: "Samsung Galaxy S23" },
  ];

  return {
    chats,
    calls,
    contacts,
    images,
    rawRecords: [...chats, ...calls, ...contacts, ...images],
  };
}
