"""
AI Router — маршрутизатор між нейромережами
Gemini · Groq/Llama · DeepSeek · Mistral · Claude
"""

import os
import asyncio
import aiohttp
import json
import logging

logger = logging.getLogger(__name__)

class AIRouter:
def __init__(self):
self.gemini_key = os.getenv("GEMINI_API_KEY", "")
self.groq_key = os.getenv("GROQ_API_KEY", "")
self.deepseek_key = os.getenv("DEEPSEEK_API_KEY", "")
self.mistral_key = os.getenv("MISTRAL_API_KEY", "")
self.openrouter_key = os.getenv("OPENROUTER_API_KEY", "")

# Яка модель для якого відділу
self.dept_models = {
"content": "mistral",
"marketing": "llama",
"studio": "gemini",
"brand": "gemini",
"agency": "deepseek",
"trends": "gemini",
"monetize": "deepseek",
"education": "llama",
"notebook": "gemini",
"sales": "deepseek",
"sites": "gemini",
"content_factory": "deepseek",
"news": "gemini",
"video_search": "gemini",
"general": "gemini",
}

async def ask(self, prompt: str, model: str = "gemini", dept: str = "general") -> str:
# Визначаємо модель по відділу якщо не вказана явно
if model == "auto":
model = self.dept_models.get(dept, "gemini")

# Пробуємо основну модель, якщо не вийде — fallback
handlers = {
"gemini": self._ask_gemini,
"llama": self._ask_groq,
"deepseek": self._ask_deepseek,
"mistral": self._ask_mistral,
}

fallback_order = ["gemini", "llama", "mistral", "deepseek"]
if model in handlers:
fallback_order = [model] + [m for m in fallback_order if m != model]

for m in fallback_order:
try:
fn = handlers.get(m)
if fn:
result = await fn(prompt)
if result:
return result
except Exception as e:
logger.warning(f"Model {m} failed: {e}")
continue

return "⚠️ Вибач, всі AI тимчасово недоступні. Спробуй пізніше."

# ─────────────────────────────────────────────
# GEMINI 2.0 FLASH
# ─────────────────────────────────────────────
async def _ask_gemini(self, prompt: str) -> str:
if not self.gemini_key:
raise Exception("No Gemini key")

url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={self.gemini_key}"
payload = {
"contents": [{"parts": [{"text": prompt}]}],
"generationConfig": {
"temperature": 0.8,
"maxOutputTokens": 2048,
}
}
async with aiohttp.ClientSession() as session:
async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=30)) as r:
data = await r.json()
return data["candidates"][0]["content"]["parts"][0]["text"]

async def ask_with_image(self, prompt: str, image_url: str) -> str:
"""Gemini Vision — аналіз фото"""
if not self.gemini_key:
return "Gemini Vision недоступний"

# Скачуємо фото
async with aiohttp.ClientSession() as session:
async with session.get(image_url) as r:
image_data = await r.read()
import base64
b64 = base64.b64encode(image_data).decode()

url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={self.gemini_key}"
payload = {
"contents": [{
"parts": [
{"text": prompt},
{"inline_data": {"mime_type": "image/jpeg", "data": b64}}
]
}]
}
async with aiohttp.ClientSession() as session:
async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=30)) as r:
data = await r.json()
return data["candidates"][0]["content"]["parts"][0]["text"]

# ─────────────────────────────────────────────
# GROQ — Llama 3.3 70B (найшвидший)
# ─────────────────────────────────────────────
async def _ask_groq(self, prompt: str) -> str:
if not self.groq_key:
raise Exception("No Groq key")

url = "https://api.groq.com/openai/v1/chat/completions"
headers = {"Authorization": f"Bearer {self.groq_key}", "Content-Type": "application/json"}
payload = {
"model": "llama-3.3-70b-versatile",
"messages": [{"role": "user", "content": prompt}],
"max_tokens": 2048,
"temperature": 0.8,
}
async with aiohttp.ClientSession() as session:
async with session.post(url, json=payload, headers=headers, timeout=aiohttp.ClientTimeout(total=30)) as r:
data = await r.json()
return data["choices"][0]["message"]["content"]

# ─────────────────────────────────────────────
# DEEPSEEK V3 — стратегія та аналітика
# ─────────────────────────────────────────────
async def _ask_deepseek(self, prompt: str) -> str:
if not self.deepseek_key:
raise Exception("No DeepSeek key")

url = "https://api.deepseek.com/chat/completions"
headers = {"Authorization": f"Bearer {self.deepseek_key}", "Content-Type": "application/json"}
payload = {
"model": "deepseek-chat",
"messages": [{"role": "user", "content": prompt}],
"max_tokens": 2048,
"temperature": 0.7,
}
async with aiohttp.ClientSession() as session:
async with session.post(url, json=payload, headers=headers, timeout=aiohttp.ClientTimeout(total=30)) as r:
data = await r.json()
return data["choices"][0]["message"]["content"]

# ─────────────────────────────────────────────
# MISTRAL — творчість та тексти
# ─────────────────────────────────────────────
async def _ask_mistral(self, prompt: str) -> str:
if not self.mistral_key:
raise Exception("No Mistral key")

url = "https://api.mistral.ai/v1/chat/completions"
headers = {"Authorization": f"Bearer {self.mistral_key}", "Content-Type": "application/json"}
payload = {
"model": "mistral-large-latest",
"messages": [{"role": "user", "content": prompt}],
"max_tokens": 2048,
"temperature": 0.8,
}
async with aiohttp.ClientSession() as session:
async with session.post(url, json=payload, headers=headers, timeout=aiohttp.ClientTimeout(total=30)) as r:
data = await r.json()
return data["choices"][0]["message"]["content"]
