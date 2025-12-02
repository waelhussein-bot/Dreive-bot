const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());

// بيانات تسجيل الدخول لحساب Pocket Option
const PO_EMAIL = "awad711271@gmail.com";
const PO_PASSWORD = "711271531";

// تشغيل المتصفح وتسجيل الدخول
let browser, page;
async function initBrowser() {
    browser = await puppeteer.launch({ headless: true });
    page = await browser.newPage();
    await page.goto('https://pocketoption.com/signin');

    await page.type('input[name="email"]', PO_EMAIL);
    await page.type('input[name="password"]', PO_PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForTimeout(5000); 
    console.log("تم تسجيل الدخول إلى Pocket Option!");
}
initBrowser();

// استقبال إشارات Webhook من TradingView
app.post('/webhook', async (req, res) => {
    const { symbol, action } = req.body; 
    console.log(`إشارة جديدة: ${action} ${symbol} | مبلغ: 1$ | مدة: 60s`);

    try {
        await openTrade(symbol, action);
        res.status(200).send('OK');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error');
    }
});

// دالة فتح صفقة دقيقة بمبلغ 1$
async function openTrade(symbol, action) {
    await page.goto(`https://pocketoption.com/trade/${symbol}`);
    await page.waitForTimeout(2000);

    if(action === 'call') {
        await page.click('.buy-button'); 
    } else {
        await page.click('.sell-button'); 
    }

    await page.evaluate(() => {
        document.querySelector('input.amount-input').value = 1;
    });

    await page.click('.place-trade-button');

    console.log(`تم فتح صفقة ${action} على ${symbol} بمبلغ 1$ لمدة دقيقة`);
}

// تشغيل السيرفر
app.listen(3000, () => console.log('بوت Pocket Option يعمل على المنفذ 3000'));
