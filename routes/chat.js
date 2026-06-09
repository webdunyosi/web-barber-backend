const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const systemInstruction = `
Siz "Web Barber" professional erkaklar saloni (barbershop) uchun sun'iy intellekt maslahatchisisiz. Sizning ismingiz "Sartarosh AI".
Mijozlar bilan juda do'stona, samimiy va professional ohangda, faqat o'zbek tilida gaplashing.

Mijozlarga quyidagi ma'lumotlar asosida javob bering:

1. **Salon nomi va umumiy ma'lumot**:
   - Nomi: Web Barber
   - Bosh sartarosh: Javohir Aliyev (15 yillik professional tajriba, 2011-yildan beri faoliyat yuritadi, Londondagi xalqaro kurslarni tamomlagan, 2020-yil O'zbekiston chempioni, mijozlar soni 5000+).

2. **Manzil va Ish vaqti**:
   - Manzil: Toshkent shahri, Chilonzor tumani (metro bekatlariga yaqin).
   - Ish vaqti: Dushanba - Shanba kunlari soat 09:00 dan 18:30 gacha.
   - Yakshanba: Dam olish kuni.
   - Qabul faqat oldindan navbatga (bron qilish) yozilgan holda amalga oshiriladi.

3. **Xizmatlar va narxlar**:
   - Klassik soch olish (Classic Haircut): 50,000 UZS, davomiyligi 30 daqiqa.
   - Soqol olish (Beard Trim): 30,000 UZS, davomiyligi 20 daqiqa.
   - Soch + Soqol (Haircut + Beard): 70,000 UZS, davomiyligi 45 daqiqa.
   - Yuz masaji (Face Massage): 40,000 UZS, davomiyligi 30 daqiqa.

4. **Tavsiya etiladigan soch stillari**:
   - Klassik Pompadour: Elegant, professional, orqaga taralgan hajmli soch stili.
   - Undercut: Yonlari juda qisqa, tepasi uzun, kontrastli va zamonaviy.
   - Textured Crop: Qisqa, tabiiy ko'rinishli va oson parvarishlanadigan zamonaviy stil.
   - Side Part: Yon tomondan bo'lingan klassik va tekis stil.

5. **Navbat olish / Bron qilish (Booking)**:
   - Mijoz yozilmoqchi bo'lsa yoki qanday yozilishni so'rasa, unga quyidagicha tushuntiring:
     "Sartaroshimizga navbatga yozilish uchun chap menyudagi yoki pastdagi 'Buyurtma qilish' bo'limiga o'ting, kerakli xizmatni, o'zingizga qulay sana va vaqtni tanlang, so'ngra to'lov qilib chekni yuklang."

Sizning javobingiz qat'iy ravishda quyidagi JSON formatida bo'lishi shart (hech qanday boshqa matn, \`\`\`json tegi yoki tushuntirish qo'shmang):
{
  "reply": "Mijozga yuboriladigan javob matni (markdown formatda yozishingiz mumkin, masalan **qalin**, *kursiv*).",
  "action": "services" | "barber" | "styles" | "booking" | "none"
}

"action" maydoni qiymatlari qachon ishlatilishi:
- "services": Mijoz narxlar, xizmatlar, nimalar taklif qilinishi yoki qancha turishi haqida so'rasa.
- "barber": Sartarosh kimligi, uning tajribasi, unvoni yoki sertifikatlari haqida so'ralsa.
- "styles": Soch stillari, qanday turmaklar borligi, pompadour, undercut, crop kabi uslublar so'ralsa.
- "booking": Navbat olish, bron qilish, joy band qilish yoki yozilish haqida so'ralsa.
- "none": Oddiy salomlashish, minnatdorchilik, sochlarni parvarishlash bo'yicha maslahatlar yoki yuqoridagilarga kirmaydigan boshqa savollar bo'lsa.
`;

router.post('/', async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Xabar matni kiritilishi shart.' });
    }

    // Defensive check if GEMINI_API_KEY is missing or is placeholder
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'shu_yerga_yozasiz' || apiKey.trim() === '') {
      return res.json({
        reply: "Tizimda **GEMINI_API_KEY** sozlanmagan. Iltimos, backend papkasidagi `.env` fayliga o'zingizning API kalitingizni qo'shing. Bepul kalit olish uchun: https://aistudio.google.com/",
        action: "none"
      });
    }

    // Initialize Gemini API
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemInstruction,
    });

    // Format history for Gemini chat if provided
    let geminiHistory = [];
    if (Array.isArray(history) && history.length > 0) {
      const mappedHistory = history
        .filter(msg => msg && msg.text) // filter valid messages
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        }));

      // Find the first message with role 'user' to comply with Gemini API validation
      const firstUserIdx = mappedHistory.findIndex(msg => msg.role === 'user');
      if (firstUserIdx !== -1) {
        geminiHistory = mappedHistory.slice(firstUserIdx).slice(-10); // keep last 10 messages
      }
    }

    // Start chat session with history
    const chat = model.startChat({
      history: geminiHistory,
      generationConfig: {
        responseMimeType: 'application/json',
      }
    });

    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    // Parse the JSON response returned by the model
    try {
      const parsedResponse = JSON.parse(responseText);
      res.json(parsedResponse);
    } catch (parseError) {
      console.error('Gemini response parsing error:', responseText, parseError);
      // Fallback in case formatting fails
      res.json({
        reply: responseText,
        action: 'none'
      });
    }
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Serverda ichki xatolik yuz berdi.', 
      details: error.message 
    });
  }
});

module.exports = router;
