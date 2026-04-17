const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
    
    console.log('Navigating to page...');
    try {
        await page.goto('http://localhost:3000/field/region/3-4', { waitUntil: 'networkidle0', timeout: 15000 });
        console.log('Page loaded successfully');
    } catch(e) {
        console.log('Nav failed:', e.message);
    }
    
    await browser.close();
})();
