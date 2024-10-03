const puppeteer = require("puppeteer");
const fs = require("fs");
const extractMatchInfo = require("./functions/extractMatchInfo");
const statistics = require("./functions/statistics_upgrade");
const checkOver1 = require("./functions/checkOver1");
const gameLinks = [];
(async () => {
  try {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    // Get today's day
    const today = new Date().getDay();
    // Define time based on today's day
    let time = today > 0 && today < 6 ? today : 0;
    // Construct URL
    const tomorrowUrl = `https://www.sportybet.com/ng/m/sport/football?sort=1&time=${time +
      1}`;
    // const tomorrowUrl = `https://www.sportybet.com/ng/m/sport/football/today?source=sport_menu&sort=0`;
    // Open tomorrow's URL
    await page.goto(tomorrowUrl);
    // Define the scroll function
    const scrollUntilElementVisible = async () => {
      await page.evaluate(() => {
        window.scrollBy(0, 50); // Scroll down by 100 pixels
      });
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second for the page to settle
    };
    //Links to open new page
    let links = [];
    //Link to save page that obeys the rule
    let obeyLink = [];
    // Keep scrolling until the element is visible
    //Count
    let count = 0;
    while (true) {
      count++;
      // Extract the links
      await scrollUntilElementVisible();
      links = await extractMatchInfo(page);
      if (links != undefined) {
        for (let i = 0; i < links.length; i++) {
          if (!obeyLink.includes(links[i].link)) {
            // Analysis is done here
            const newPage = await browser.newPage();
            newPage.goto(links[i].link);
            try {
              await newPage.waitForNavigation();
              // Click on stat
              try {
                await newPage.waitForSelector(".m-icon.m-icon-stat", {
                  timeout: 10000
                });
                const isOver1OptionAval = await checkOver1(newPage);
                if (isOver1OptionAval === true) {
                  await newPage.click(".m-icon.m-icon-stat");
                  try {
                    console.log("\n" + links[i].teams);
                    const pageUrl = await statistics(newPage);
                    if (pageUrl != undefined) {
                      gameLinks.push(pageUrl);
                    }
                  } catch (error) {
                    console.log(error);
                  }
                }
              } catch (error) {
                console.log(error);
              }
              if (newPage != undefined) {
                await newPage.close();
              }
              obeyLink.push(links[i].link);
            } catch (error) {
              console.log("Error while waiting for navigation!");
            }
          }
        }
        console.log("Total Match scanned: ", obeyLink.length);
        console.log("Game Link Url: ", gameLinks);
      }
      await scrollUntilElementVisible();
      const stopLoadMore = await page.$(".bet-load-more-none");
      if (stopLoadMore) {
        // The element is visible, stop scrolling
        break;
      }
      fs.writeFile("gameLinks.txt", gameLinks.join("\n"), err => {
        if (err) {
          console.error("Error writing to file:", err);
        } else {
          console.log("Game links saved to gameLinks.txt");
        }
      });
    }
    console.log("Game Link Url: ", gameLinks);
    // Write the gameLinks to a text file
    await browser.close();
  } catch (error) {
    console.log("An error occurred:", error);
    process.exit(0);
  }
})();
