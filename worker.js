import asyncio
import logging
import os
import json
from datetime import datetime
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
Application, CommandHandler, MessageHandler,
CallbackQueryHandler, filters, ContextTypes
)
from ai_router import AIRouter
from memory import Memory
from search import SearchEngine
import telebot

TOKEN =8871963243:AAGAyt1gq2UTTl-H70EGbabZuW3xHL900qc"
bot = telebot.TeleBot(TOKEN)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# ІНІЦІАЛІЗАЦІЯ
# ─────────────────────────────────────────────
router = AIRouter()
memory = Memory()
search = SearchEngine()

# ─────────────────────────────────────────────
# МЕНЮ ВІДДІЛІВ
# ─────────────────────────────────────────────
DEPARTMENTS = {
"content": ("📹 Контент-відділ", "Сценарії, ідеї, відео, тренди"),
"marketing": ("📊 Маркетинг", "Стратегії, воронки, реклама, аналітика"),
"studio": ("🎬 Студія", "Зйомки, монтаж, світло, режисура"),
"brand": ("👗 JENKOP Бренд", "Одяг, стиль, колекції, продажі"),
"agency": ("🏢 Агенція", "Продажі, клієнти, процеси, команда"),
"trends": ("📈 Тренди", "UA + Світ, що залітає прямо зараз"),
"monetize": ("💰 Монетизація", "Блог, YouTube, партнерки, дохід"),
"education": ("🎓 Навчання", "Курси, матеріали, будь-яка сфера"),
"notebook": ("📝 Записник", "Зберегти ідею, нотатку, референс"),
"sales": ("🤝 Продажі", "Скрипти, пітчі, робота з клієнтами"),
"sites": ("🌐 Пошук сайтів", "Знайти ресурс, сервіс, інструмент"),
"content_factory": ("🏭 Контент-завод", "Система, потоки, автоматизація"),
"news": ("📰 AI Новини", "Останні новини зі світу AI та медіа"),
"video_search": ("🎥 Пошук відео", "Знайти відео-референс під задачу"),
}

# ─────────────────────────────────────────────
# /start
# ─────────────────────────────────────────────
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
user = update.effective_user
memory.set_user(user.id, user.first_name)

keyboard = build_main_menu()
await update.message.reply_text(
f"👋 Привіт, *{user.first_name}*!\n\n"
"Я твоя *Права Рука 2.0* — AI-офіс у твоєму телефоні 🔥\n\n"
"На основі: Gemini · Llama · DeepSeek · Mistral · Claude\n\n"
"Обери відділ або просто напиши мені що потрібно 👇",
parse_mode="Markdown",
reply_markup=keyboard
)

def build_main_menu():
buttons = []
items = list(DEPARTMENTS.items())
for i in range(0, len(items), 2):
row = []
for key, (name, _) in items[i:i+2]:
row.append(InlineKeyboardButton(name, callback_data=f"dept_{key}"))
buttons.append(row)
return InlineKeyboardMarkup(buttons)

# ─────────────────────────────────────────────
# CALLBACK — натискання кнопки відділу
# ─────────────────────────────────────────────
async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
query = update.callback_query
await query.answer()
data = query.data

if data.startswith("dept_"):
key = data.replace("dept_", "")
name, desc = DEPARTMENTS.get(key, ("Відділ", ""))
context.user_data["current_dept"] = key

dept_keyboards = {
"trends": [
[InlineKeyboardButton("🇺🇦 Тренди України", callback_data="trends_ua"),
InlineKeyboardButton("🌍 Тренди Світу", callback_data="trends_world")],
[InlineKeyboardButton("🔥 Що залітає зараз", callback_data="trends_now"),
InlineKeyboardButton("📱 TikTok тренди", callback_data="trends_tiktok")],
[InlineKeyboardButton("⬅️ Назад", callback_data="back_main")],
],
"content": [
[InlineKeyboardButton("✍️ Написати сценарій", callback_data="content_script"),
InlineKeyboardButton("💡 Ідеї для контенту", callback_data="content_ideas")],
[InlineKeyboardButton("🎥 Знайти відео-референс", callback_data="video_search"),
InlineKeyboardButton("🎵 Підібрати аудіо", callback_data="content_audio")],
[InlineKeyboardButton("⬅️ Назад", callback_data="back_main")],
],
"notebook": [
[InlineKeyboardButton("💾 Зберегти нотатку", callback_data="note_save"),
InlineKeyboardButton("📂 Мої нотатки", callback_data="note_list")],
[InlineKeyboardButton("🖼️ Зберегти фото-референс", callback_data="note_photo"),
InlineKeyboardButton("🗑️ Очистити", callback_data="note_clear")],
[InlineKeyboardButton("⬅️ Назад", callback_data="back_main")],
],
}

keyboard_rows = dept_keyboards.get(key, [
[InlineKeyboardButton("💬 Запитати", callback_data=f"ask_{key}"),
InlineKeyboardButton("⬅️ Назад", callback_data="back_main")]
])

await query.edit_message_text(
f"*{name}*\n_{desc}_\n\nОбери дію або напиши запит:",
parse_mode="Markdown",
reply_markup=InlineKeyboardMarkup(keyboard_rows)
)

elif data == "back_main":
await query.edit_message_text(
"🏠 Головне меню — обери відділ:",
reply_markup=build_main_menu()
)

elif data.startswith("trends_"):
await handle_trends(query, data, context)

elif data.startswith("content_"):
await handle_content_action(query, data, context)

elif data.startswith("note_"):
await handle_notebook(query, data, context, update)

elif data == "video_search":
context.user_data["awaiting"] = "video_search"
await query.edit_message_text(
"🎥 *Пошук відео-референсу*\n\nНапиши що шукати (тема, стиль, настрій):",
parse_mode="Markdown"
)

elif data.startswith("ask_"):
dept = data.replace("ask_", "")
context.user_data["current_dept"] = dept
context.user_data["awaiting"] = "dept_question"
name, _ = DEPARTMENTS.get(dept, ("відділ", ""))
await query.edit_message_text(
f"✏️ *{name}*\n\nНапиши своє питання або задачу:",
parse_mode="Markdown"
)

# ─────────────────────────────────────────────
# ТРЕНДИ
# ─────────────────────────────────────────────
async def handle_trends(query, data, context):
queries = {
"trends_ua": "тренди соцмережі Україна 2024 що залітає TikTok Instagram",
"trends_world": "global social media trends viral content 2024",
"trends_now": "viral trends today TikTok Instagram YouTube 2024",
"trends_tiktok": "TikTok trends Ukraine viral sounds hashtags 2024",
}
titles = {
"trends_ua": "🇺🇦 Тренди України",
"trends_world": "🌍 Тренди Світу",
"trends_now": "🔥 Що залітає ЗАРАЗ",
"trends_tiktok": "📱 TikTok тренди",
}
await query.edit_message_text(f"🔍 Шукаю {titles.get(data, 'тренди')}...")
results = await search.search(queries.get(data, "trends"))
prompt = f"Ти AI-помічник Кари — медіа-підприємця. Проаналізуй ці тренди та дай 5-7 конкретних ідей для контенту:\n\n{results}"
response = await router.ask(prompt, model="gemini", dept="trends")
await query.edit_message_text(
f"*{titles.get(data, 'Тренди')}*\n\n{response}",
parse_mode="Markdown",
reply_markup=InlineKeyboardMarkup([[
InlineKeyboardButton("⬅️ Назад до трендів", callback_data="dept_trends")
]])
)

# ─────────────────────────────────────────────
# КОНТЕНТ ДІЇ
# ─────────────────────────────────────────────
async def handle_content_action(query, data, context):
if data == "content_script":
context.user_data["awaiting"] = "script"
await query.edit_message_text(
"✍️ *Сценарій*\n\nОпиши тему, платформу та настрій відео:",
parse_mode="Markdown"
)
elif data == "content_ideas":
context.user_data["awaiting"] = "ideas"
await query.edit_message_text(
"💡 *Ідеї для контенту*\n\nПро що робимо контент? Платформа?",
parse_mode="Markdown"
)
elif data == "content_audio":
context.user_data["awaiting"] = "audio"
await query.edit_message_text(
"🎵 *Підбір аудіо*\n\nОпиши відео/настрій — підберу 3 варіанти аудіо:",
parse_mode="Markdown"
)

# ─────────────────────────────────────────────
# ЗАПИСНИК
# ─────────────────────────────────────────────
async def handle_notebook(query, data, context, update):
user_id = query.from_user.id
if data == "note_save":
context.user_data["awaiting"] = "save_note"
await query.edit_message_text("📝 Напиши нотатку — збережу її:")
elif data == "note_list":
notes = memory.get_notes(user_id)
if notes:
text = "📂 *Твої нотатки:*\n\n"
for i, n in enumerate(notes[-10:], 1):
text += f"{i}. {n['text'][:100]}\n_{n['date']}_\n\n"
else:
text = "📂 Нотатки порожні. Напиши щось — збережу!"
await query.edit_message_text(text, parse_mode="Markdown",
reply_markup=InlineKeyboardMarkup([[
InlineKeyboardButton("⬅️ Назад", callback_data="dept_notebook")
]]))
elif data == "note_photo":
context.user_data["awaiting"] = "save_photo_note"
await query.edit_message_text("🖼️ Надішли фото — збережу як референс:")
elif data == "note_clear":
memory.clear_notes(user_id)
await query.edit_message_text("🗑️ Нотатки очищено!",
reply_markup=InlineKeyboardMarkup([[
InlineKeyboardButton("⬅️ Назад", callback_data="dept_notebook")
]]))

# ─────────────────────────────────────────────
# ОБРОБКА ТЕКСТОВИХ ПОВІДОМЛЕНЬ
# ─────────────────────────────────────────────
async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
user_id = update.effective_user.id
text = update.message.text
awaiting = context.user_data.get("awaiting")
dept = context.user_data.get("current_dept", "general")

# Зберегти нотатку
if awaiting == "save_note":
memory.save_note(user_id, text)
context.user_data.pop("awaiting", None)
await update.message.reply_text("✅ Нотатку збережено!",
reply_markup=InlineKeyboardMarkup([[
InlineKeyboardButton("📂 Всі нотатки", callback_data="note_list"),
InlineKeyboardButton("🏠 Меню", callback_data="back_main")
]]))
return

# Пошук відео
if awaiting == "video_search":
context.user_data.pop("awaiting", None)
await update.message.reply_text("🔍 Шукаю відео-референси...")
results = await search.search(f"video reference {text} instagram tiktok reels")
prompt = f"Знайди та опиши 5 ідеальних відео-референсів для: {text}\n\nДані пошуку:\n{results}\n\nДля кожного: назва, де знайти, чому підходить, що взяти з ідеї."
response = await router.ask(prompt, model="gemini", dept="content")
await update.message.reply_text(f"🎥 *Відео-референси для:* _{text}_\n\n{response}",
parse_mode="Markdown",
reply_markup=InlineKeyboardMarkup([[
InlineKeyboardButton("🏠 Меню", callback_data="back_main")
]]))
return

# Аудіо підбір
if awaiting == "audio":
context.user_data.pop("awaiting", None)
prompt = f"""Підбери 3 варіанти аудіо для відео: {text}

Для кожного варіанту:
1. Назва треку / жанр
2. Настрій та темп
3. Де знайти безкоштовно (YouTube Audio Library, Epidemic Sound free, etc.)
4. Чому підходить саме для цього відео

Будь конкретною!"""
response = await router.ask(prompt, model="mistral", dept="content")
await update.message.reply_text(f"🎵 *3 варіанти аудіо:*\n\n{response}",
parse_mode="Markdown",
reply_markup=InlineKeyboardMarkup([[
InlineKeyboardButton("🏠 Меню", callback_data="back_main")
]]))
return

# Сценарій
if awaiting == "script":
context.user_data.pop("awaiting", None)
await update.message.reply_text("✍️ Пишу сценарій...")
user_style = memory.get_style(user_id)
prompt = f"""Ти пишеш для Кари — медіа-підприємця, власниці агенції та бренду JENKOP.
{f"Стиль Кари: {user_style}" if user_style else ""}

Напиши потужний сценарій для: {text}

Структура:
🎬 ГАЧОК (перші 3 секунди — зупиняє скролінг)
📖 ОСНОВНА ЧАСТИНА (цінність / історія / проблема-рішення)
💥 КУЛЬМІНАЦІЯ (найсильніший момент)
📣 ЗАКЛИК ДО ДІЇ

Стиль: живий, динамічний, як Кара говорить — без води."""
response = await router.ask(prompt, model="mistral", dept="content")
await update.message.reply_text(f"✍️ *Сценарій готовий:*\n\n{response}",
parse_mode="Markdown",
reply_markup=InlineKeyboardMarkup([[
InlineKeyboardButton("🔄 Ще варіант", callback_data="content_script"),
InlineKeyboardButton("🏠 Меню", callback_data="back_main")
]]))
return

# Ідеї контенту
if awaiting == "ideas":
context.user_data.pop("awaiting", None)
await update.message.reply_text("💡 Генерую ідеї...")
results = await search.search(f"{text} content ideas trends 2024")
prompt = f"""Ти контент-стратег Кари. Згенеруй 10 вогняних ідей для контенту на тему: {text}

Тренди з пошуку: {results[:500]}

Для кожної ідеї:
• Формат (Reels / Stories / TikTok / YouTube)
• Гачок (перше речення)
• Чому залетить
• Хештеги (3-5)"""
response = await router.ask(prompt, model="gemini", dept="content")
await update.message.reply_text(f"💡 *10 ідей для контенту:*\n\n{response}",
parse_mode="Markdown",
reply_markup=InlineKeyboardMarkup([[
InlineKeyboardButton("🏠 Меню", callback_data="back_main")
]]))
return

# Питання по відділу
if awaiting == "dept_question":
context.user_data.pop("awaiting", None)
await handle_dept_question(update, context, text, dept)
return

# Загальне повідомлення — розумна відповідь
await handle_general(update, context, text, user_id)

# ─────────────────────────────────────────────
# ПИТАННЯ ПО ВІДДІЛУ
# ─────────────────────────────────────────────
async def handle_dept_question(update, context, text, dept):
dept_prompts = {
"agency": "Ти експерт з побудови медіа-агенцій. Кара будує свою агенцію.",
"brand": "Ти експерт з fashion-брендів. Кара має бренд одягу JENKOP.",
"studio": "Ти експерт з творчих студій — зйомки, монтаж, виробництво.",
"marketing": "Ти топ маркетолог для медіа та креативного бізнесу.",
"monetize": "Ти експерт з монетизації контенту та блогів.",
"sales": "Ти експерт з продажів у креативній індустрії.",
"content_factory": "Ти експерт з побудови контент-заводів — системи виробництва контенту.",
"education": "Знайди найкращі навчальні матеріали по темі.",
"sites": "Знайди найкращі сайти та ресурси по запиту.",
}

model_map = {
"agency": "deepseek",
"brand": "gemini",
"studio": "mistral",
"marketing": "llama",
"monetize": "deepseek",
"sales": "deepseek",
"content_factory": "deepseek",
"education": "llama",
"sites": "gemini",
}

system = dept_prompts.get(dept, "Ти AI-помічник Кари — медіа-підприємця.")
model = model_map.get(dept, "gemini")

await update.message.reply_text("⏳ Думаю...")
results = ""
if dept in ["education", "sites", "news"]:
results = await search.search(text)

prompt = f"{system}\n\nЗапит Кари: {text}"
if results:
prompt += f"\n\nДані з пошуку:\n{results[:800]}"

response = await router.ask(prompt, model=model, dept=dept)
dept_name, _ = DEPARTMENTS.get(dept, ("Відповідь", ""))

await update.message.reply_text(
f"*{dept_name}*\n\n{response}",
parse_mode="Markdown",
reply_markup=InlineKeyboardMarkup([[
InlineKeyboardButton("⬅️ Назад до відділу", callback_data=f"dept_{dept}"),
InlineKeyboardButton("🏠 Меню", callback_data="back_main")
]])
)

# ─────────────────────────────────────────────
# ЗАГАЛЬНИЙ ЧАТ
# ─────────────────────────────────────────────
async def handle_general(update, context, text, user_id):
await update.message.reply_text("💭 Думаю...")
history = memory.get_history(user_id)
user_style = memory.get_style(user_id)

needs_search = any(w in text.lower() for w in [
"новини", "тренд", "що нового", "знайди", "пошук", "сайт",
"news", "trend", "find", "search", "2024", "зараз"
])

search_data = ""
if needs_search:
search_data = await search.search(text)

prompt = f"""Ти — Права Рука Кари, персональний AI-помічник.
Кара — медіа-підприємець, власниця агенції, бренду JENKOP та творчої студії.
{f"Стиль Кари: {user_style}" if user_style else ""}
Відповідай як розумний дружбан — по суті, без зайвої води, з конкретикою.

{f"Контекст розмови: {history[-3:]}" if history else ""}

Питання: {text}
{f"Дані пошуку: {search_data[:600]}" if search_data else ""}"""

response = await router.ask(prompt, model="gemini", dept="general")
memory.add_history(user_id, text, response)

await update.message.reply_text(
response,
parse_mode="Markdown",
reply_markup=InlineKeyboardMarkup([[
InlineKeyboardButton("🏠 Меню", callback_data="back_main")
]])
)

# ─────────────────────────────────────────────
# ФОТО
# ─────────────────────────────────────────────
async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
user_id = update.effective_user.id
awaiting = context.user_data.get("awaiting")
caption = update.message.caption or ""

if awaiting == "save_photo_note":
context.user_data.pop("awaiting", None)
memory.save_note(user_id, f"[ФОТО] {caption}", photo=True)
await update.message.reply_text("✅ Фото-референс збережено!",
reply_markup=InlineKeyboardMarkup([[
InlineKeyboardButton("🏠 Меню", callback_data="back_main")
]]))
return

# Аналіз фото через Gemini
await update.message.reply_text("🖼️ Аналізую фото...")
photo = update.message.photo[-1]
file = await context.bot.get_file(photo.file_id)
file_url = file.file_path

prompt = caption if caption else "Проаналізуй це фото. Визнач стиль, кольори, настрій, естетику. Як це можна використати для контенту Кари?"
response = await router.ask_with_image(prompt, file_url)
memory.save_note(user_id, f"[ФОТО аналіз] {caption or 'без опису'}: {response[:200]}")

await update.message.reply_text(
f"🖼️ *Аналіз фото:*\n\n{response}",
parse_mode="Markdown",
reply_markup=InlineKeyboardMarkup([[
InlineKeyboardButton("💾 Зберегти як референс", callback_data="note_photo"),
InlineKeyboardButton("🏠 Меню", callback_data="back_main")
]])
)

# ─────────────────────────────────────────────
# AI НОВИНИ
# ─────────────────────────────────────────────
async def news_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
await update.message.reply_text("📰 Збираю свіжі новини...")
results = await search.search("AI news media marketing Ukraine 2024 latest")
prompt = f"Зроби дайджест останніх новин зі світу AI, медіа та маркетингу. Топ-5 найважливіших для Кари — медіа-підприємця:\n\n{results}"
response = await router.ask(prompt, model="gemini", dept="news")
await update.message.reply_text(
f"📰 *AI & Медіа новини:*\n\n{response}",
parse_mode="Markdown",
reply_markup=InlineKeyboardMarkup([[
InlineKeyboardButton("🏠 Меню", callback_data="back_main")
]])
)

# ─────────────────────────────────────────────
# ЗАПУСК
# ─────────────────────────────────────────────
def main():
token = os.getenv("TELEGRAM_TOKEN")
if not token:
print("❌ TELEGRAM_TOKEN не знайдено в .env")
return

app = Application.builder().token(token).build()
app.add_handler(CommandHandler("start", start))
app.add_handler(CommandHandler("news", news_command))
app.add_handler(CallbackQueryHandler(handle_callback))
app.add_handler(MessageHandler(filters.PHOTO, handle_photo))
app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

print("🚀 KARA BOT запущено!")
app.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
main()
