const DEPARTMENTS = {
content: ["📹 Контент-відділ", "Сценарії, ідеї, відео, тренди"],
marketing: ["📊 Маркетинг", "Стратегії, воронки, реклама, аналітика"],
studio: ["🎬 Студія", "Зйомки, монтаж, світло, режисура"],
brand: ["👗 JENKOP Бренд", "Одяг, стиль, колекції, продажі"],
agency: ["🏢 Агенція", "Продажі, клієнти, процеси, команда"],
trends: ["📈 Тренди", "UA + Світ, що залітає прямо зараз"],
monetize: ["💰 Монетизація", "Блог, YouTube, партнерки, дохід"],
education: ["🎓 Навчання", "Курси, матеріали, будь-яка сфера"],
notebook: ["📝 Записник", "Зберегти ідею, нотатку, референс"],
sales: ["🤝 Продажі", "Скрипти, пітчі, робота з клієнтами"],
sites: ["🌐 Пошук сайтів", "Знайти ресурс, сервіс, інструмент"],
content_factory: ["🏭 Контент-завод", "Система, потоки, автоматизація"],
news: ["📰 AI Новини", "Останні новини зі світу AI та медіа"],
video_search: ["🎥 Пошук відео", "Знайти відео-референс під задачу"],
};

const DEPT_MODELS = {
content: "mistral",
marketing: "llama",
studio: "gemini",
brand: "gemini",
agency: "deepseek",
trends: "gemini",
monetize: "deepseek",
education: "llama",
notebook: "gemini",
sales: "deepseek",
sites: "gemini",
content_factory: "deepseek",
news: "gemini",
video_search: "gemini",
general: "gemini",
};

const DEPT_PROMPTS = {
agency: "Ти експерт з побудови медіа-агенцій. Кара будує свою агенцію.",
brand: "Ти експерт з fashion-брендів. Кара має бренд одягу JENKOP.",
studio: "Ти експерт з творчих студій — зйомки, монтаж, виробництво.",
marketing: "Ти топ маркетолог для медіа та креативного бізнесу.",
monetize: "Ти експерт з монетизації контенту та блогів.",
sales: "Ти експерт з продажів у креативній індустрії.",
content_factory: "Ти експерт з побудови контент-заводів — системи виробництва контенту.",
education: "Знайди найкращі навчальні матеріали по темі.",
sites: "Знайди найкращі сайти та ресурси по запиту.",
};

// ═══════════════════════════════════════════════════
// ГОЛОВНИЙ ОБРОБНИК
// ═══════════════════════════════════════════════════
export default {
async fetch(request, env) {
if (request.method !== "POST") return new Response("OK");
try {
const update = await request.json();
await handleUpdate(update, env);
} catch (e) {
console.error("Error:", e);
}
return new Response("OK");
},
};

async function handleUpdate(update, env) {
// Callback query (натискання кнопки)
if (update.callback_query) {
await handleCallback(update.callback_query, env);
return;
}

const msg = update.message;
if (!msg) return;

const chatId = msg.chat.id;
const userId = msg.from.id;
const text = msg.text || "";
const firstName = msg.from.first_name || "друже";

// Фото
if (msg.photo) {
await handlePhoto(msg, env);
return;
}

// Команди
if (text === "/start") {
await sendStart(chatId, firstName, env);
return;
}
if (text === "/news") {
await sendNews(chatId, env);
return;
}

// Перевіряємо стан юзера (awaiting)
const state = await getState(userId, env);

if (state?.awaiting === "save_note") {
await setState(userId, {}, env);
await saveNote(userId, text, env);
await sendMessage(chatId, "✅ Нотатку збережено!", env, [[
{ text: "📂 Всі нотатки", callback_data: "note_list" },
{ text: "🏠 Меню", callback_data: "back_main" },
]]);
return;
}

if (state?.awaiting === "video_search") {
await setState(userId, {}, env);
await sendMessage(chatId, "🔍 Шукаю відео-референси...", env);
const prompt = `Знайди та опиши 5 ідеальних відео-референсів для: ${text}\n\nДля кожного: назва, де знайти, чому підходить, що взяти з ідеї.`;
const response = await askAI(prompt, "gemini", env);
await sendMessage(chatId, `🎥 *Відео-референси для:* _${text}_\n\n${response}`, env, [[
{ text: "🏠 Меню", callback_data: "back_main" },
]]);
return;
}

if (state?.awaiting === "audio") {
await setState(userId, {}, env);
const prompt = `Підбери 3 варіанти аудіо для відео: ${text}\n\nДля кожного:\n1. Назва треку / жанр\n2. Настрій та темп\n3. Де знайти безкоштовно\n4. Чому підходить`;
const response = await askAI(prompt, "mistral", env);
await sendMessage(chatId, `🎵 *3 варіанти аудіо:*\n\n${response}`, env, [[
{ text: "🏠 Меню", callback_data: "back_main" },
]]);
return;
}

if (state?.awaiting === "script") {
await setState(userId, {}, env);
await sendMessage(chatId, "✍️ Пишу сценарій...", env);
const prompt = `Ти пишеш для Кари — медіа-підприємця, власниці агенції та бренду JENKOP.\n\nНапиши потужний сценарій для: ${text}\n\nСтруктура:\n🎬 ГАЧОК (перші 3 секунди)\n📖 ОСНОВНА ЧАСТИНА\n💥 КУЛЬМІНАЦІЯ\n📣 ЗАКЛИК ДО ДІЇ\n\nСтиль: живий, динамічний, без води.`;
const response = await askAI(prompt, "mistral", env);
await sendMessage(chatId, `✍️ *Сценарій готовий:*\n\n${response}`, env, [[
{ text: "🔄 Ще варіант", callback_data: "content_script" },
{ text: "🏠 Меню", callback_data: "back_main" },
]]);
return;
}

if (state?.awaiting === "ideas") {
await setState(userId, {}, env);
await sendMessage(chatId, "💡 Генерую ідеї...", env);
const prompt = `Ти контент-стратег Кари. Згенеруй 10 вогняних ідей для контенту на тему: ${text}\n\nДля кожної:\n• Формат (Reels / Stories / TikTok / YouTube)\n• Гачок\n• Чому залетить\n• Хештеги (3-5)`;
const response = await askAI(prompt, "gemini", env);
await sendMessage(chatId, `💡 *10 ідей для контенту:*\n\n${response}`, env, [[
{ text: "🏠 Меню", callback_data: "back_main" },
]]);
return;
}

if (state?.awaiting === "dept_question") {
const dept = state.dept || "general";
await setState(userId, {}, env);
await handleDeptQuestion(chatId, text, dept, env);
return;
}

// Загальний чат
await handleGeneral(chatId, userId, text, env);
}

// ═══════════════════════════════════════════════════
// /start
// ═══════════════════════════════════════════════════
async function sendStart(chatId, firstName, env) {
const keyboard = buildMainMenu();
await sendMessage(
chatId,
`👋 Привіт, *${firstName}*!\n\nЯ твоя *Права Рука 2.0* — AI-офіс у твоєму телефоні 🔥\n\nНа основі: Gemini · Llama · DeepSeek · Mistral\n\nОбери відділ або просто напиши мені що потрібно 👇`,
env,
keyboard
);
}

function buildMainMenu() {
const items = Object.entries(DEPARTMENTS);
const rows = [];
for (let i = 0; i < items.length; i += 2) {
const row = [];
for (const [key, [name]] of items.slice(i, i + 2)) {
row.push({ text: name, callback_data: `dept_${key}` });
}
rows.push(row);
}
return rows;
}

// ═══════════════════════════════════════════════════
// CALLBACK HANDLER
// ═══════════════════════════════════════════════════
async function handleCallback(query, env) {
const chatId = query.message.chat.id;
const userId = query.from.id;
const data = query.data;
const msgId = query.message.message_id;

await answerCallback(query.id, env);

if (data === "back_main") {
await editMessage(chatId, msgId, "🏠 Головне меню — обери відділ:", env, buildMainMenu());
return;
}

if (data.startsWith("dept_")) {
const key = data.replace("dept_", "");
const [name, desc] = DEPARTMENTS[key] || ["Відділ", ""];
await setState(userId, { current_dept: key }, env);

const deptKeyboards = {
trends: [
[
{ text: "🇺🇦 Тренди України", callback_data: "trends_ua" },
{ text: "🌍 Тренди Світу", callback_data: "trends_world" },
],
[
{ text: "🔥 Що залітає зараз", callback_data: "trends_now" },
{ text: "📱 TikTok тренди", callback_data: "trends_tiktok" },
],
[{ text: "⬅️ Назад", callback_data: "back_main" }],
],
content: [
[
{ text: "✍️ Написати сценарій", callback_data: "content_script" },
{ text: "💡 Ідеї для контенту", callback_data: "content_ideas" },
],
[
{ text: "🎥 Відео-референс", callback_data: "video_search" },
{ text: "🎵 Підібрати аудіо", callback_data: "content_audio" },
],
[{ text: "⬅️ Назад", callback_data: "back_main" }],
],
notebook: [
[
{ text: "💾 Зберегти нотатку", callback_data: "note_save" },
{ text: "📂 Мої нотатки", callback_data: "note_list" },
],
[
{ text: "🗑️ Очистити", callback_data: "note_clear" },
{ text: "⬅️ Назад", callback_data: "back_main" },
],
],
};

const keyboard = deptKeyboards[key] || [
[
{ text: "💬 Запитати", callback_data: `ask_${key}` },
{ text: "⬅️ Назад", callback_data: "back_main" },
],
];

await editMessage(chatId, msgId, `*${name}*\n_${desc}_\n\nОбери дію або напиши запит:`, env, keyboard);
return;
}

// Тренди
if (data.startsWith("trends_")) {
const queries = {
trends_ua: "тренди соцмережі Україна 2025 що залітає TikTok Instagram",
trends_world: "global social media trends viral content 2025",
trends_now: "viral trends today TikTok Instagram YouTube 2025",
trends_tiktok: "TikTok trends Ukraine viral sounds hashtags 2025",
};
const titles = {
trends_ua: "🇺🇦 Тренди України",
trends_world: "🌍 Тренди Світу",
trends_now: "🔥 Що залітає ЗАРАЗ",
trends_tiktok: "📱 TikTok тренди",
};
await editMessage(chatId, msgId, `🔍 Шукаю ${titles[data] || "тренди"}...`, env);
const prompt = `Ти AI-помічник Кари — медіа-підприємця. Проаналізуй тренди та дай 5-7 конкретних ідей для контенту по темі: ${queries[data]}`;
const response = await askAI(prompt, "gemini", env);
await editMessage(chatId, msgId, `*${titles[data]}*\n\n${response}`, env, [[
{ text: "⬅️ Назад до трендів", callback_data: "dept_trends" },
]]);
return;
}

// Контент дії
if (data === "content_script") {
await setState(userId, { awaiting: "script" }, env);
await editMessage(chatId, msgId, "✍️ *Сценарій*\n\nОпиши тему, платформу та настрій відео:", env);
return;
}
if (data === "content_ideas") {
await setState(userId, { awaiting: "ideas" }, env);
await editMessage(chatId, msgId, "💡 *Ідеї для контенту*\n\nПро що робимо контент? Платформа?", env);
return;
}
if (data === "content_audio") {
await setState(userId, { awaiting: "audio" }, env);
await editMessage(chatId, msgId, "🎵 *Підбір аудіо*\n\nОпиши відео/настрій — підберу 3 варіанти:", env);
return;
}

// Відео пошук
if (data === "video_search") {
await setState(userId, { awaiting: "video_search" }, env);
await editMessage(chatId, msgId, "🎥 *Пошук відео-референсу*\n\nНапиши що шукати (тема, стиль, настрій):", env);
return;
}

// Нотатки
if (data === "note_save") {
await setState(userId, { awaiting: "save_note" }, env);
await editMessage(chatId, msgId, "📝 Напиши нотатку — збережу її:", env);
return;
}
if (data === "note_list") {
const notes = await getNotes(userId, env);
let text = notes.length
? "📂 *Твої нотатки:*\n\n" + notes.slice(-10).map((n, i) => `${i + 1}. ${n.text.slice(0, 100)}\n_${n.date}_`).join("\n\n")
: "📂 Нотатки порожні. Напиши щось — збережу!";
await editMessage(chatId, msgId, text, env, [[
{ text: "⬅️ Назад", callback_data: "dept_notebook" },
]]);
return;
}
if (data === "note_clear") {
await clearNotes(userId, env);
await editMessage(chatId, msgId, "🗑️ Нотатки очищено!", env, [[
{ text: "⬅️ Назад", callback_data: "dept_notebook" },
]]);
return;
}

// Запитати по відділу
if (data.startsWith("ask_")) {
const dept = data.replace("ask_", "");
await setState(userId, { awaiting: "dept_question", dept }, env);
const [name] = DEPARTMENTS[dept] || ["Відділ"];
await editMessage(chatId, msgId, `✏️ *${name}*\n\nНапиши своє питання або задачу:`, env);
return;
}
}

// ═══════════════════════════════════════════════════
// ПИТАННЯ ПО ВІДДІЛУ
// ═══════════════════════════════════════════════════
async function handleDeptQuestion(chatId, text, dept, env) {
await sendMessage(chatId, "⏳ Думаю...", env);
const system = DEPT_PROMPTS[dept] || "Ти AI-помічник Кари — медіа-підприємця.";
const model = DEPT_MODELS[dept] || "gemini";
const prompt = `${system}\n\nЗапит Кари: ${text}`;
const response = await askAI(prompt, model, env);
const [deptName] = DEPARTMENTS[dept] || ["Відповідь"];
await sendMessage(chatId, `*${deptName}*\n\n${response}`, env, [[
{ text: `⬅️ Назад до відділу`, callback_data: `dept_${dept}` },
{ text: "🏠 Меню", callback_data: "back_main" },
]]);
}

// ═══════════════════════════════════════════════════
// ЗАГАЛЬНИЙ ЧАТ
// ═══════════════════════════════════════════════════
async function handleGeneral(chatId, userId, text, env) {
await sendMessage(chatId, "💭 Думаю...", env);
const prompt = `Ти — Права Рука Кари, персональний AI-помічник.\nКара — медіа-підприємець, власниця агенції, бренду JENKOP та творчої студії.\nВідповідай як розумний дружбан — по суті, без зайвої води, з конкретикою.\n\nПитання: ${text}`;
const response = await askAI(prompt, "gemini", env);
await sendMessage(chatId, response, env, [[
{ text: "🏠 Меню", callback_data: "back_main" },
]]);
}

// ═══════════════════════════════════════════════════
// ФОТО
// ═══════════════════════════════════════════════════
async function handlePhoto(msg, env) {
const chatId = msg.chat.id;
const userId = msg.from.id;
const caption = msg.caption || "";
const state = await getState(userId, env);

if (state?.awaiting === "save_photo_note") {
await setState(userId, {}, env);
await saveNote(userId, `[ФОТО] ${caption}`, env);
await sendMessage(chatId, "✅ Фото-референс збережено!", env, [[
{ text: "🏠 Меню", callback_data: "back_main" },
]]);
return;
}

await sendMessage(chatId, "🖼️ Аналізую фото...", env);
const photo = msg.photo[msg.photo.length - 1];
const fileRes = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${photo.file_id}`);
const fileData = await fileRes.json();
const fileUrl = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${fileData.result.file_path}`;

const imageRes = await fetch(fileUrl);
const imageBytes = await imageRes.arrayBuffer();
const b64 = btoa(String.fromCharCode(...new Uint8Array(imageBytes)));

const prompt = caption || "Проаналізуй це фото. Визнач стиль, кольори, настрій, естетику. Як це можна використати для контенту Кари?";
const response = await askGeminiVision(prompt, b64, env);

await sendMessage(chatId, `🖼️ *Аналіз фото:*\n\n${response}`, env, [[
{ text: "🏠 Меню", callback_data: "back_main" },
]]);
}

// ═══════════════════════════════════════════════════
// AI НОВИНИ
// ═══════════════════════════════════════════════════
async function sendNews(chatId, env) {
await sendMessage(chatId, "📰 Збираю свіжі новини...", env);
const prompt = "Зроби дайджест останніх новин зі світу AI, медіа та маркетингу. Топ-5 найважливіших для Кари — медіа-підприємця. Будь конкретним, з датами та джерелами.";
const response = await askAI(prompt, "gemini", env);
await sendMessage(chatId, `📰 *AI & Медіа новини:*\n\n${response}`, env, [[
{ text: "🏠 Меню", callback_data: "back_main" },
]]);
}

// ═══════════════════════════════════════════════════
// AI РОУТЕР
// ═══════════════════════════════════════════════════
async function askAI(prompt, model, env) {
const fallbackOrder = [model, "gemini", "llama", "mistral", "deepseek"].filter(
(v, i, a) => a.indexOf(v) === i
);

for (const m of fallbackOrder) {
try {
let result;
if (m === "gemini") result = await askGemini(prompt, env);
else if (m === "llama") result = await askGroq(prompt, env);
else if (m === "deepseek") result = await askDeepSeek(prompt, env);
else if (m === "mistral") result = await askMistral(prompt, env);
if (result) return result;
} catch (e) {
console.warn(`Model ${m} failed:`, e.message);
}
}
return "⚠️ Вибач, всі AI тимчасово недоступні. Спробуй пізніше.";
}

async function askGemini(prompt, env) {
const key = env.GEMINI_API_KEY;
if (!key) throw new Error("No Gemini key");
const res = await fetch(
`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
{
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
contents: [{ parts: [{ text: prompt }] }],
generationConfig: { temperature: 0.8, maxOutputTokens: 2048 },
}),
}
);
const data = await res.json();
return data.candidates?.[0]?.content?.parts?.[0]?.text;
}

async function askGeminiVision(prompt, b64, env) {
const key = env.GEMINI_API_KEY;
if (!key) return "Gemini Vision недоступний";
const res = await fetch(
`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
{
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
contents: [{
parts: [
{ text: prompt },
{ inline_data: { mime_type: "image/jpeg", data: b64 } },
],
}],
}),
}
);
const data = await res.json();
return data.candidates?.[0]?.content?.parts?.[0]?.text || "Не вдалося проаналізувати фото";
}

async function askGroq(prompt, env) {
const key = env.GROQ_API_KEY;
if (!key) throw new Error("No Groq key");
const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
method: "POST",
headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
body: JSON.stringify({
model: "llama-3.3-70b-versatile",
messages: [{ role: "user", content: prompt }],
max_tokens: 2048,
temperature: 0.8,
}),
});
const data = await res.json();
return data.choices?.[0]?.message?.content;
}

async function askDeepSeek(prompt, env) {
const key = env.DEEPSEEK_API_KEY;
if (!key) throw new Error("No DeepSeek key");
const res = await fetch("https://api.deepseek.com/chat/completions", {
method: "POST",
headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
body: JSON.stringify({
model: "deepseek-chat",
messages: [{ role: "user", content: prompt }],
max_tokens: 2048,
temperature: 0.7,
}),
});
const data = await res.json();
return data.choices?.[0]?.message?.content;
}

async function askMistral(prompt, env) {
const key = env.MISTRAL_API_KEY;
if (!key) throw new Error("No Mistral key");
const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
method: "POST",
headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
body: JSON.stringify({
model: "mistral-large-latest",
messages: [{ role: "user", content: prompt }],
max_tokens: 2048,
temperature: 0.8,
}),
});
const data = await res.json();
return data.choices?.[0]?.message?.content;
}

// ═══════════════════════════════════════════════════
// KV — стан та нотатки (зберігається в Cloudflare KV)
// ═══════════════════════════════════════════════════
async function getState(userId, env) {
try {
const val = await env.BOT_KV.get(`state_${userId}`);
return val ? JSON.parse(val) : {};
} catch { return {}; }
}

async function setState(userId, state, env) {
await env.BOT_KV.put(`state_${userId}`, JSON.stringify(state), { expirationTtl: 3600 });
}

async function saveNote(userId, text, env) {
const notes = await getNotes(userId, env);
notes.push({ text, date: new Date().toLocaleDateString("uk-UA") });
await env.BOT_KV.put(`notes_${userId}`, JSON.stringify(notes.slice(-50)));
}

async function getNotes(userId, env) {
try {
const val = await env.BOT_KV.get(`notes_${userId}`);
return val ? JSON.parse(val) : [];
} catch { return []; }
}

async function clearNotes(userId, env) {
await env.BOT_KV.delete(`notes_${userId}`);
}

// ═══════════════════════════════════════════════════
// TELEGRAM API HELPERS
// ═══════════════════════════════════════════════════
async function sendMessage(chatId, text, env, keyboard = null) {
const body = {
chat_id: chatId,
text,
parse_mode: "Markdown",
};
if (keyboard) body.reply_markup = { inline_keyboard: keyboard };
await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify(body),
});
}

async function editMessage(chatId, msgId, text, env, keyboard = null) {
const body = {
chat_id: chatId,
message_id: msgId,
text,
parse_mode: "Markdown",
};
if (keyboard) body.reply_markup = { inline_keyboard: keyboard };
await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/editMessageText`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify(body),
});
}

async function answerCallback(callbackId, env) {
await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ callback_query_id: callbackId }),
});
}
