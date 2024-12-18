import puppeteer from 'puppeteer';
import moment from 'moment-timezone';
import fs from 'fs';
// config
import { SCRAPE_SITE_URL, SCRAPE_NAMES } from './config';
import { formatDate } from './Utils/format';

const delay = (ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const scrapeStakeData = async () => {
    console.log("Stake Data Scraping started.");
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(SCRAPE_SITE_URL, { timeout: 60000 });
    await page.setViewport({ width: 1440, height: 858 });
    await page.waitForSelector('.ant-table-row');

    const stakeDataArray = [];

    for (let index = 0; index < SCRAPE_NAMES.length; index++) {

        await delay(2000); // Wait for 2 seconds  

        const targetText = SCRAPE_NAMES[index];

        console.log(targetText, "=======>targetText");

        const elementHandle: any = await page.evaluateHandle(targetText => {
            const elements = Array.from(document.querySelectorAll('.ant-table-row'));
            // Find the first element that contains the my text  
            return elements.find((el: any) => el.innerText.includes(targetText));
        }, targetText);

        await page.evaluate(el => {
            el.scrollIntoView({ block: 'center' });
        }, elementHandle);

        if (elementHandle) {


            const cellActionHandles = await elementHandle.$$('.cell-action');

            if (cellActionHandles.length >= 1) {
                const firstCellActionHandle = cellActionHandles[0]; // Get the click button for display modal  
                console.log(`Element that contain the ${targetText} text found.`);
                // Ensure the cell-action is visible and clickable before clicking it  
                const isVisible = await page.evaluate(el => {
                    return el.offsetWidth > 0 && el.offsetHeight > 0;
                }, firstCellActionHandle);

                if (isVisible) {

                    const isClickable = await page.evaluate(el => {
                        const rect = el.getBoundingClientRect();
                        return (
                            rect.width > 0 &&
                            rect.height > 0 &&
                            el.offsetParent !== null
                        );
                    }, firstCellActionHandle);
                    if (isClickable) {
                        
                        await firstCellActionHandle.click();

                        const modal: any = await page.evaluateHandle(() => {
                            const element = document.querySelector('.ant-modal-content');
                            return element;
                        });

                        const pagenationHandles = await modal.$$('.ant-pagination-item');

                        for (let i = 0; i < pagenationHandles.length; i++) {
                            const pagenationBtn = pagenationHandles[i];

                            const pagenationBtnisVisible = await page.evaluate(el => {
                                return el.offsetWidth > 0 && el.offsetHeight > 0;
                            }, pagenationBtn);

                            if (pagenationBtnisVisible) {
                                await pagenationBtn.click();
                                const stakeDataTable: any = await page.evaluateHandle(() => {
                                    const element = document.querySelectorAll('.ant-table-tbody')[1];
                                    return element;
                                });
                                // const stakeDataTable = await modal.$$('.ant-table-tbody');
                                const stakeDataRows = await stakeDataTable.$$('.ant-table-row');
                                for (let j = 0; j < stakeDataRows.length; j++) {
                                    const row = stakeDataRows[j];
                                    const stakeDataColumns = await row.$$('.ant-table-cell');
                                    const Address = await stakeDataColumns[1].evaluate((el: any) => el.innerText);
                                    const Amount = await stakeDataColumns[2].evaluate((el: any) => el.innerText);
                                    const startTime = formatDate(await stakeDataColumns[3].evaluate((el: any) => el.innerText));
                                    const endTime = formatDate(await stakeDataColumns[4].evaluate((el: any) => el.innerText));

                                    const data = [Address, Amount, startTime, endTime];
                                    stakeDataArray.push(data);
                                }
                            }

                        }

                        const closeModalHandle: any = await page.waitForSelector('.ant-modal-close', { visible: true });

                        const closeModalHandleIsVisible = await page.evaluate(el => {
                            return el.offsetWidth > 0 && el.offsetHeight > 0;
                        }, closeModalHandle);

                        if (closeModalHandleIsVisible) {
                            await closeModalHandle.click();
                        }
                    }

                }
            }

        }
    }
    await browser.close();
    generateJson(JSON.stringify(stakeDataArray, null, '\n'))
}

const generateJson = async (jsonData: any) => {
    const month = moment().tz('America/New_York').format('MMM');
    const day = moment().tz('America/New_York').format("DD");
    const fileName = `newStakes${month}_${day}.json`;

    const path = `${__dirname}/data/${fileName}`;
    if (await fs.existsSync(path)) {
        fs.unlinkSync(path);
    }
    fs.writeFileSync(path, jsonData);
    console.log('Done!!!');
}
scrapeStakeData();