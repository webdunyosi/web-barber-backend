const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Xabar matni kiritilishi shart.' });
    }

    const text = message.toLowerCase().trim();
    let reply = "";
    let action = "none";

    // Keyword matching logic
    if (
      text.includes('salom') || 
      text.includes('assalom') || 
      text.includes('hello') || 
      text.includes('ism') || 
      text.includes('qale') || 
      text.includes('qalaysiz')
    ) {
      reply = "Salom! Men **Web Barber** salonining AI yordamchisiman. Sizga qanday yordam bera olaman?\nXizmatlarimiz, soch stillari yoki bo'sh vaqtlarimiz haqida so'rashingiz mumkin.";
      action = "none";
    } else if (
      text.includes('narx') || 
      text.includes('xizmat') || 
      text.includes('pul') || 
      text.includes('qancha') || 
      text.includes('cost') || 
      text.includes('price') || 
      text.includes('klassik') || 
      text.includes('soch kesish') || 
      text.includes('soch olish') || 
      text.includes('soqol') || 
      text.includes('yuz masaji')
    ) {
      reply = "Bizning xizmatlarimiz va narxlarimiz:\n\n* **Klassik soch olish**: 50,000 UZS (30 daqiqa)\n* **Soqol olish**: 30,000 UZS (20 daqiqa)\n* **Soch + Soqol**: 70,000 UZS (45 daqiqa)\n* **Yuz masaji**: 40,000 UZS (30 daqiqa)\n\nSizga qaysi xizmatimiz ma'qul?";
      action = "services";
    } else if (
      text.includes('sartarosh') || 
      text.includes('javohir') || 
      text.includes('aliyev') || 
      text.includes('ustasi') || 
      text.includes('tajriba') || 
      text.includes('master')
    ) {
      reply = "Bizning bosh sartaroshimiz — **Javohir Aliyev**.\n\nU 15 yillik professional tajribaga ega (2011-yildan buyon faoliyat yuritadi). Londondagi xalqaro kurslarni tamomlagan va 2020-yilda O'zbekiston chempioni bo'lgan. Hozirgacha 5000 dan ortiq mijozlarga xizmat ko'rsatgan!";
      action = "barber";
    } else if (
      text.includes('stil') || 
      text.includes('turmak') || 
      text.includes('pricheska') || 
      text.includes('pompadour') || 
      text.includes('undercut') || 
      text.includes('crop') || 
      text.includes('side part')
    ) {
      reply = "Bizda quyidagi soch stillari juda mashhur:\n\n* **Klassik Pompadour**: Elegant va hajmli orqaga taralgan stil.\n* **Undercut**: Yonlari qisqa, tepasi uzun, kontrastli stil.\n* **Textured Crop**: Qisqa, tabiiy va parvarish qilish oson stil.\n* **Side Part**: Yon tomondan bo'lingan klassik tekis stil.";
      action = "styles";
    } else if (
      text.includes('bron') || 
      text.includes('yozilish') || 
      text.includes('buyurtma') || 
      text.includes('navbat') || 
      text.includes('vaqt') || 
      text.includes('sana') || 
      text.includes('yozilmoqchiman') || 
      text.includes('joy band')
    ) {
      reply = "Sartaroshimizga navbatga yozilish uchun chap menyudagi yoki pastdagi **'Buyurtma'** bo'limiga o'ting, kerakli xizmatni, o'zingizga qulay sana va vaqtni tanlang, so'ngra to'lov qilib chekni yuklang.";
      action = "booking";
    } else if (
      text.includes('manzil') || 
      text.includes('qayerda') || 
      text.includes('lokatsiya') || 
      text.includes('location') || 
      text.includes('adres')
    ) {
      reply = "Bizning manzilimiz: **Toshkent shahri, Chilonzor tumani** (metro bekatlariga yaqin joylashgan).\n\nKeling, sizni kutib qolamiz! 💈";
      action = "none";
    } else if (
      text.includes('ish vaqti') || 
      text.includes('soat nechada') || 
      text.includes('vaqti') || 
      text.includes('kunlari') || 
      text.includes('ochiq')
    ) {
      reply = "Bizning ish vaqtimiz:\n\n* **Dushanba - Shanba**: 09:00 dan 18:30 gacha.\n* **Yakshanba**: Dam olish kuni.\n\nEslatib o'tamiz, qabul faqat oldindan navbatga yozilgan holda amalga oshiriladi!";
      action = "none";
    } else if (
      text.includes('rahmat') || 
      text.includes('sog\' bo\'ling') || 
      text.includes('katta rahmat') || 
      text.includes('ok') || 
      text.includes('tushunarli')
    ) {
      reply = "Arziydi! Har doim xizmatizdamiz. **Web Barber** saloniga tashrif buyurishingizni kutib qolamiz! 💈";
      action = "none";
    } else {
      reply = "Kechirasiz, men faqat **Web Barber** saloni xizmatlari, bosh sartaroshimiz, soch stillari, manzilimiz va navbatga yozilish haqidagi savollarga javob bera olaman. Sizga xizmatlarimiz yoki navbatga yozilish haqida ma'lumot beraymi?";
      action = "none";
    }

    res.json({ reply, action });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Serverda ichki xatolik yuz berdi.', 
      details: error.message 
    });
  }
});

module.exports = router;
