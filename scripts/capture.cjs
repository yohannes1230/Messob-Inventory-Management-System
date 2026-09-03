const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.resolve(__dirname, '../docs/screenshots/phase-4');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function captureScreenshots() {
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // Helper to load clean portal
  async function loadCleanPortal() {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
  }

  // 1. English Personal Dashboard & My Assets (FR-ESS-08, FR-ESS-02)
  console.log('Capturing 01_portal_dashboard_kpis.png...');
  await loadCleanPortal();
  await page.screenshot({
    path: path.join(OUTPUT_DIR, '01_portal_dashboard_kpis.png'),
    fullPage: false,
  });

  // 2. Accept Custody Modal (FR-ESS-03)
  console.log('Capturing 02_accept_custody_modal.png...');
  await loadCleanPortal();
  await page.getByRole('button', { name: 'Accept Custody' }).first().click();
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, '02_accept_custody_modal.png'),
    fullPage: false,
  });

  // 3. Return Request Modal (FR-ESS-04)
  console.log('Capturing 03_return_request_modal.png...');
  await loadCleanPortal();
  await page.getByRole('button', { name: 'Return Asset' }).first().click();
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, '03_return_request_modal.png'),
    fullPage: false,
  });

  // 4. Report Damage / Issue Modal (FR-ESS-05)
  console.log('Capturing 04_report_issue_modal.png...');
  await loadCleanPortal();
  await page.getByRole('button', { name: 'Report Issue' }).first().click();
  await page.waitForTimeout(600);
  const attachBtn = page.getByText('+ Add Photo Evidence');
  if (await attachBtn.isVisible()) {
    await attachBtn.click();
    await page.waitForTimeout(300);
  }
  await page.screenshot({
    path: path.join(OUTPUT_DIR, '04_report_issue_modal.png'),
    fullPage: false,
  });

  // 5. New Property Request 3-Step Wizard (FR-ESS-01 & SRS §6.2.2)
  console.log('Capturing 05_new_property_request_3step.png...');
  await loadCleanPortal();
  await page.getByRole('tab', { name: /My Requests/i }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: '+ New Property Request' }).click();
  await page.waitForTimeout(500);
  await page.getByText('Next Step →').click();
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, '05_new_property_request_3step.png'),
    fullPage: false,
  });

  // 6. Custody History Timeline (FR-ESS-06)
  console.log('Capturing 06_custody_history_timeline.png...');
  await loadCleanPortal();
  await page.getByRole('button', { name: 'View Custody Timeline' }).first().click();
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, '06_custody_history_timeline.png'),
    fullPage: false,
  });

  // 7. My Requests Tab with Status Badges & In-App Notification (FR-ESS-07)
  console.log('Capturing 07_my_requests_inapp_notification.png...');
  await loadCleanPortal();
  await page.getByRole('button', { name: 'Return Asset' }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Submit Return Request' }).click();
  await page.waitForTimeout(500);
  await page.getByRole('tab', { name: /My Requests/i }).click();
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, '07_my_requests_inapp_notification.png'),
    fullPage: false,
  });

  // 8. Amharic Employee Self-Service Portal Localization (All FR-ESS Features in Amharic)
  console.log('Capturing 08_amharic_employee_portal.png...');
  await loadCleanPortal();
  await page.getByRole('button', { name: /Toggle Language/i }).click();
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, '08_amharic_employee_portal.png'),
    fullPage: false,
  });

  console.log('SUCCESS: All 8 Phase 4 screenshots successfully generated into docs/screenshots/phase-4/!');
  await browser.close();
}

captureScreenshots().catch((err) => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
